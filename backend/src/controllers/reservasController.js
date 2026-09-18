const Reserva = require('../models/Reserva');
const Pasajero = require('../models/Pasajero');
const FlightSegment = require('../models/FlightSegment');
const { generarPNRUnico } = require('../utils/pnrGenerator');
const pool = require('../config/db');
const { obtenerImpuestos } = require('../services/taxService');
const { resolverClase } = require('../utils/fareClass');

const crearReserva = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { customer_id, vuelos, pasajeros, time_limit_minutes = 30 } = req.body;

    // Validaciones
    if (!customer_id) {
      await connection.rollback();
      return res.status(400).json({ error: 'customer_id es obligatorio' });
    }
    if (!vuelos || vuelos.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Debe seleccionar al menos un vuelo' });
    }
    if (!pasajeros || pasajeros.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Debe agregar al menos un pasajero' });
    }

    // Validar disponibilidad de cada vuelo
    for (const vuelo of vuelos) {
      const disponibilidad = await FlightSegment.validarDisponibilidad(vuelo.flight_id, vuelo.fare_class || 'economy', connection);
      if (disponibilidad.available_seats < pasajeros.length) {
        await connection.rollback();
        return res.status(409).json({ 
          error: 'No hay suficientes asientos disponibles',
          vuelo: disponibilidad.flight_number,
          disponibles: disponibilidad.available_seats,
          requeridos: pasajeros.length
        });
      }
    }

    // Resolver y bloquear la tarifa neta vigente de cada vuelo/clase. El total
    // de venta suma las reglas fiscales del aeropuerto de salida; base_price
    // nunca se usa como respaldo para cobrar.
    const tarifasPorVuelo = new Map();
    for (const v of vuelos) {
      const clase = resolverClase(v.fare_class || 'economy');
      const [tarifa] = await connection.query(
        `SELECT ff.id, ff.price, ff.seats_allocated,
                (SELECT COUNT(*) FROM flight_segments fs JOIN reservations rx ON rx.id = fs.reservation_id
                  WHERE fs.flight_id = ? AND fs.fare_class = ? AND rx.status IN ('pending','confirmed','paid')) AS ocupados_clase
         FROM flight_fares ff JOIN fare_classes fc ON fc.id = ff.fare_class_id
         WHERE ff.flight_id = ? AND fc.code = ? AND ff.active = 1
           AND ff.valid_from <= NOW() AND (ff.valid_to IS NULL OR ff.valid_to > NOW())
         ORDER BY ff.valid_from DESC, ff.id DESC FOR UPDATE`,
        [v.flight_id, clase.segmentCode, v.flight_id, clase.fareCode]
      );
      if (!tarifa.length) {
        await connection.rollback();
        return res.status(409).json({ error: `La clase ${v.fare_class || 'economy'} no está disponible para venta en este vuelo: no tiene una tarifa vigente.` });
      }
      const cupo = tarifa[0].seats_allocated;
      if (cupo !== null && cupo > 0 && cupo - tarifa[0].ocupados_clase < pasajeros.length) {
        await connection.rollback();
        return res.status(409).json({
          error: `Cupo insuficiente para la clase ${v.fare_class || 'economy'} en este vuelo`,
          cupo_clase: cupo, ocupados: tarifa[0].ocupados_clase, requeridos: pasajeros.length
        });
      }
      const impuestos = await obtenerImpuestos(v.flight_id, Number(tarifa[0].price), connection);
      tarifasPorVuelo.set(String(v.flight_id), { id: tarifa[0].id, precio: Number(tarifa[0].price), clase: clase.segmentCode, impuestos });
    }

    const factorPasajero = (tipo) => tipo === 'child' ? 0.75 : tipo === 'infant' ? 0.10 : 1;
    const estimated_total = Math.round(
      pasajeros.reduce((total, pax) => total + vuelos.reduce((porTramo, v) =>
        porTramo + (tarifasPorVuelo.get(String(v.flight_id)).precio + tarifasPorVuelo.get(String(v.flight_id)).impuestos.total) * factorPasajero(pax.passenger_type || 'adult'), 0), 0) * 100
    ) / 100;

    // Generar PNR único
    const pnr = await generarPNRUnico(connection);

    // Crear reserva
    const [resultReserva] = await connection.query(
      `INSERT INTO reservations (pnr, customer_id, user_id, status, estimated_total, currency, created_at, time_limit) 
       VALUES (?, ?, ?, 'pending', ?, 'USD', NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [pnr, customer_id, req.usuario ? req.usuario.id : null, estimated_total, time_limit_minutes]
    );
    const reservation_id = resultReserva.insertId;

    // Crear pasajeros
    const pasajerosCreados = [];
    for (const pax of pasajeros) {
      if (!pax.first_names || !pax.last_names || !pax.document_number) {
        await connection.rollback();
        return res.status(400).json({ error: 'Todos los pasajeros deben tener nombres, apellidos y documento' });
      }

      const [resultPax] = await connection.query(
        `INSERT INTO passengers (reservation_id, passenger_type, first_names, last_names, document_type, document_number, birth_date, nationality, email, phone) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reservation_id,
          pax.passenger_type || 'adult',
          pax.first_names,
          pax.last_names,
          pax.document_type,
          pax.document_number,
          pax.birth_date || null,
          pax.nationality || 'SV',
          pax.email || null,
          pax.phone || null
        ]
      );
      pasajerosCreados.push({ id: resultPax.insertId, ...pax });
    }

    // Asignar segmentos de vuelo
    for (const pax of pasajerosCreados) {
      for (const vuelo of vuelos) {
        const tarifa = tarifasPorVuelo.get(String(vuelo.flight_id));
        const factor = factorPasajero(pax.passenger_type || 'adult');
        const precioUnitario = Math.round(tarifa.precio * factor * 100) / 100;
        await FlightSegment.asignar({
          reservation_id,
          passenger_id: pax.id,
          flight_id: vuelo.flight_id,
          fare_class: tarifa.clase,
          seat: vuelo.seat || null,
          fare_id: tarifa.id,
          unit_price: precioUnitario,
          total_price: precioUnitario
        }, connection);
        for (const impuesto of tarifa.impuestos.lines) {
          const monto = Math.round(impuesto.amount * factor * 100) / 100;
          await connection.query(
            `INSERT INTO reservation_tax_lines (reservation_id, passenger_id, flight_id, tax_rule_id, country_id, airport_id, code, name, calculation_type, rate, taxable_amount, amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [reservation_id, pax.id, vuelo.flight_id, impuesto.id, impuesto.country_id, impuesto.airport_id, impuesto.code, impuesto.name, impuesto.calculation_type, impuesto.value, Math.round(impuesto.taxable_amount * factor * 100) / 100, monto]
          );
        }
      }
    }

    await connection.commit();

    res.status(201).json({
      exito: true,
      mensaje: 'Reserva creada exitosamente',
      datos: {
        pnr: pnr,
        reservation_id: reservation_id,
        total_passengers: pasajeros.length,
        total_flights: vuelos.length,
        estimated_total: estimated_total
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error al crear reserva:', error);
    
    // Mensajes de error específicos
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una reserva con ese PNR. Intente nuevamente.' });
    }
    if (error.message.includes('No hay asientos disponibles')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Error interno al crear la reserva',
      detalle: error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

const consultarReserva = async (req, res) => {
  try {
    const reserva = await Reserva.obtenerDetalleCompleto(req.params.pnr);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
    const expirada = new Date(reserva.time_limit) < new Date() && reserva.status === 'pending';
    res.json({ exito: true, datos: { ...reserva, expirada } });
  } catch (error) {
    console.error('Error al consultar reserva:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const listarReservas = async (req, res) => {
  try {
    const reservas = await Reserva.listar(req.query);
    res.json({ exito: true, total: reservas.length, datos: reservas });
  } catch (error) {
    console.error('Error al listar reservas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const cancelarReserva = async (req, res) => {
  try {
    const { pnr } = req.params;
    const { motivo } = req.body;
    const reserva = await Reserva.buscarPorPNR(pnr);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (reserva.status === 'cancelled') return res.status(400).json({ error: 'La reserva ya está cancelada' });
    if (reserva.status === 'completed') return res.status(400).json({ error: 'No se puede cancelar una reserva finalizada' });
    await Reserva.cancelar(reserva.id, motivo || 'Cancelación solicitada', req.usuario ? req.usuario.id : null);
    await FlightSegment.liberarPorReserva(reserva.id);
    res.json({ exito: true, mensaje: 'Reserva cancelada', datos: { pnr, status: 'cancelled' } });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { crearReserva, consultarReserva, listarReservas, cancelarReserva };
