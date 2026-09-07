const Reserva = require('../models/Reserva');
const Pasajero = require('../models/Pasajero');
const FlightSegment = require('../models/FlightSegment');
const { generarPNRUnico } = require('../utils/pnrGenerator');
const pool = require('../config/db');

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

    // Calcular total estimado
    let sumaPrecios = 0;
    for (const v of vuelos) {
      const [fv] = await connection.query('SELECT base_price FROM flights WHERE id = ?', [v.flight_id]);
      sumaPrecios += parseFloat(fv[0] ? fv[0].base_price : 250);
    }
    const estimated_total = sumaPrecios * pasajeros.length;

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
        await FlightSegment.asignar({
          reservation_id,
          passenger_id: pax.id,
          flight_id: vuelo.flight_id,
          fare_class: vuelo.fare_class || 'economy',
          seat: vuelo.seat || null
        }, connection);
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
