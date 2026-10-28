const Reserva = require('../models/Reserva');
const Pasajero = require('../models/Pasajero');
const FlightSegment = require('../models/FlightSegment');
const { generarPNRUnico } = require('../utils/pnrGenerator');
const pool = require('../config/db');
const { obtenerImpuestos, calcularPrecioServicio } = require('../services/taxService');
const { resolverClase } = require('../utils/fareClass');
const { centavos } = require('../utils/money');
const { edadEnFecha, tipoPorNacimiento } = require('../utils/passengerAge');
const { crearMapaAsientos, errorAsientoPasajero } = require('../utils/asientos');
const { cancelarServiciosReserva } = require('../services/reservationInventoryService');

const importesPasajero = (tarifa, tipo) => {
  const porcentaje = tipo === 'child' ? 75 : tipo === 'infant' ? 10 : 100;
  const aplicar = monto => Math.round(centavos(monto) * porcentaje / 100);
  return { base: aplicar(tarifa.precio), impuestos: tarifa.impuestos.lines.map(line => ({ ...line, amount: aplicar(line.amount), taxable_amount: aplicar(line.taxable_amount) })) };
};
const esDui = (tipo) => ['13', 'DUI'].includes(String(tipo || '').trim().toUpperCase());
const esPasaporte = (tipo) => ['3', 'PASSPORT', 'PASAPORTE'].includes(String(tipo || '').trim().toUpperCase());

const crearReserva = async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { customer_id, vuelos, pasajeros, ancillaries = [], time_limit_minutes = 30 } = req.body;

    // Validaciones
    if (!customer_id) {
      await connection.rollback();
      return res.status(400).json({ error: 'customer_id es obligatorio' });
    }
    if (!Array.isArray(vuelos) || vuelos.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Debe seleccionar al menos un vuelo' });
    }
    if (!Array.isArray(pasajeros) || pasajeros.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Debe agregar al menos un pasajero' });
    }
    for (const pax of pasajeros) {
      const edad = edadEnFecha(pax?.birth_date);
      const tipo = tipoPorNacimiento(pax?.birth_date);
      if (!tipo || tipo !== (pax.passenger_type || 'adult')) {
        await connection.rollback();
        return res.status(400).json({ error: 'Fecha de nacimiento inválida o tipo de pasajero incompatible con su edad actual' });
      }
      if (edad < 18 && esDui(pax.document_type)) {
        throw Object.assign(new Error('Los pasajeros menores de 18 años no pueden registrarse con DUI; indique pasaporte u otro documento permitido.'), { statusCode: 400 });
      }
    }

    // Bloquear los vuelos siempre en el mismo orden para serializar ventas y
    // evitar interbloqueos entre itinerarios con varios tramos.
    const idsVuelos = vuelos.map(v => Number(v.flight_id));
    if (idsVuelos.some(id => !Number.isInteger(id) || id <= 0) || new Set(idsVuelos).size !== idsVuelos.length) {
      throw Object.assign(new Error('Los vuelos seleccionados deben ser válidos y no repetirse'), { statusCode: 400 });
    }
    const asientosPorVuelo = new Map();
    const numeroVueloPorId = new Map();
    const paisesPorTrayecto = [];
    for (const vuelo of [...vuelos].sort((a, b) => Number(a.flight_id) - Number(b.flight_id))) {
      const disponibilidad = await FlightSegment.validarDisponibilidad(vuelo.flight_id, vuelo.fare_class || 'economy', connection);
      paisesPorTrayecto.push({
        origen: String(disponibilidad.origin_country_code || '').trim().toUpperCase(),
        destino: String(disponibilidad.destination_country_code || '').trim().toUpperCase(),
        numero: disponibilidad.flight_number
      });
      if (!disponibilidad.disponible) {
        await connection.rollback();
        return res.status(409).json({
          error: disponibilidad.motivo || `El vuelo ${disponibilidad.flight_number} no está disponible para la venta.`,
          vuelo: disponibilidad.flight_number,
          disponibles: disponibilidad.available_seats,
          requeridos: pasajeros.length
        });
      }
      if (disponibilidad.available_seats < pasajeros.length) {
        await connection.rollback();
        return res.status(409).json({
          error: `No se puede completar la compra: el vuelo ${disponibilidad.flight_number} tiene ${disponibilidad.available_seats} asientos disponibles y se solicitaron ${pasajeros.length} boletos.`,
          vuelo: disponibilidad.flight_number,
          disponibles: disponibilidad.available_seats,
          requeridos: pasajeros.length
        });
      }
      if (vuelo.asientos !== undefined && (!Array.isArray(vuelo.asientos) || vuelo.asientos.length !== pasajeros.length)) {
        throw Object.assign(new Error('Indique un asiento por pasajero para cada vuelo'), { statusCode: 400 });
      }
      if (vuelo.seat && (pasajeros.length !== 1 || vuelo.asientos !== undefined)) {
        throw Object.assign(new Error('Indique los asientos por pasajero para cada vuelo'), { statusCode: 400 });
      }
      const entradaAsientos = vuelo.asientos !== undefined
        ? vuelo.asientos
        : vuelo.seat ? [vuelo.seat] : Array(pasajeros.length).fill(null);
      const asientosSolicitados = entradaAsientos.map(seat => {
        if (seat == null || seat === '') return null;
        if (typeof seat !== 'string') throw Object.assign(new Error('Asiento inválido'), { statusCode: 400 });
        return seat.trim().toUpperCase();
      });
      const mapa = crearMapaAsientos(disponibilidad.total_capacity);
      const [filasOcupadas] = await connection.query(
        `SELECT UPPER(TRIM(fs.seat)) AS seat FROM flight_segments fs
         JOIN reservations rx ON rx.id = fs.reservation_id
         WHERE fs.flight_id = ? AND fs.seat IS NOT NULL AND rx.status IN ('pending','confirmed','paid') FOR UPDATE`,
        [vuelo.flight_id]
      );
      const ocupados = new Set(filasOcupadas.map((fila) => fila.seat));
      const seleccionados = new Set();
      const asientos = [];
      for (let i = 0; i < asientosSolicitados.length; i++) {
        const pax = pasajeros[i];
        let seat = asientosSolicitados[i];
        if (!seat) {
          seat = mapa.asientos.find((opcion) => !ocupados.has(opcion) && !seleccionados.has(opcion)
            && !errorAsientoPasajero(opcion, disponibilidad.total_capacity, pax.passenger_type || 'adult', pax.birth_date));
          if (!seat) throw Object.assign(new Error(`No se encontró un asiento disponible y permitido para ${pax.first_names || `el pasajero ${i + 1}`} en el vuelo ${disponibilidad.flight_number}`), { statusCode: 409 });
        }
        const error = errorAsientoPasajero(seat, disponibilidad.total_capacity, pax.passenger_type || 'adult', pax.birth_date);
        if (error) throw Object.assign(new Error(error), { statusCode: 400 });
        if (seleccionados.has(seat)) throw Object.assign(new Error(`El asiento ${seat} está asignado a más de un pasajero`), { statusCode: 409 });
        seleccionados.add(seat);
        if (ocupados.has(seat) || await FlightSegment.validarAsiento(vuelo.flight_id, seat, connection)) {
          throw Object.assign(new Error(`El asiento ${seat} ya está ocupado en este vuelo`), { statusCode: 409 });
        }
        asientos.push(seat);
      }
      asientosPorVuelo.set(String(vuelo.flight_id), asientos);
      numeroVueloPorId.set(String(vuelo.flight_id), disponibilidad.flight_number);
    }

    const paisesConDuiPermitido = new Set(['GT', 'HN', 'NI']);
    const requierePasaporte = paisesPorTrayecto.some(({ origen, destino }) => {
      const vueloDomesticoSv = origen === 'SV' && destino === 'SV';
      const corredorRegional = (origen === 'SV' && paisesConDuiPermitido.has(destino))
        || (destino === 'SV' && paisesConDuiPermitido.has(origen));
      return !vueloDomesticoSv && !corredorRegional;
    });
    if (requierePasaporte) {
      const pasajeroSinPasaporte = pasajeros.find((pax) => !esPasaporte(pax.document_type));
      if (pasajeroSinPasaporte) {
        throw Object.assign(new Error('Este itinerario requiere pasaporte. El requisito aplica a los vuelos internacionales que no son entre El Salvador y Guatemala, Honduras o Nicaragua.'), { statusCode: 400 });
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
           AND (ff.valid_to IS NULL OR ff.valid_to > NOW())
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

    if (!Array.isArray(ancillaries) || ancillaries.length > 100) {
      throw Object.assign(new Error('La lista de servicios adicionales no es válida'), { statusCode: 400 });
    }
    const vuelosDeReserva = new Set(vuelos.map((vuelo) => String(vuelo.flight_id)));
    const serviciosReservados = [];
    const serviciosDuplicados = new Set();
    let totalAncillariesCentavos = 0;
    const ancillariesOrdenados = [...ancillaries].sort((a, b) =>
      Number(a.flight_id) - Number(b.flight_id) || Number(a.ancillary_id) - Number(b.ancillary_id)
    );
    for (const linea of ancillariesOrdenados) {
      const flightId = Number(linea.flight_id);
      const ancillaryId = Number(linea.ancillary_id);
      const cantidad = Number(linea.quantity ?? 1);
      const clave = `${flightId}:${ancillaryId}`;
      if (!Number.isInteger(flightId) || !Number.isInteger(ancillaryId) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
        throw Object.assign(new Error('Servicio o cantidad inválidos'), { statusCode: 400 });
      }
      if (!vuelosDeReserva.has(String(flightId))) {
        throw Object.assign(new Error('Cada servicio debe corresponder a un vuelo seleccionado en la reserva'), { statusCode: 400 });
      }
      if (serviciosDuplicados.has(clave)) {
        throw Object.assign(new Error('No repitas el mismo servicio para el mismo vuelo'), { statusCode: 400 });
      }
      serviciosDuplicados.add(clave);

      const [disponibilidad] = await connection.query(
        `SELECT fa.id, fa.stock, fa.price_override, a.base_price, a.iva_incluido
         FROM flight_ancillaries fa JOIN ancillaries a ON a.id = fa.ancillary_id
         WHERE fa.flight_id = ? AND fa.ancillary_id = ? AND fa.active = 1 AND a.active = 1
         FOR UPDATE`,
        [flightId, ancillaryId]
      );
      if (!disponibilidad.length) {
        throw Object.assign(new Error('Uno de los servicios ya no está disponible para ese vuelo'), { statusCode: 409 });
      }
      if (Number(disponibilidad[0].stock) < cantidad) {
        throw Object.assign(new Error('No hay inventario suficiente para uno de los servicios seleccionados'), { statusCode: 409 });
      }
      const precioBase = disponibilidad[0].price_override ?? disponibilidad[0].base_price;
      const importe = await calcularPrecioServicio(flightId, precioBase, Number(disponibilidad[0].iva_incluido) === 1, connection);
      const precioCentavos = centavos(importe.precioFinal);
      if (precioCentavos < 0) throw Object.assign(new Error('El precio del servicio no es válido'), { statusCode: 409 });
      totalAncillariesCentavos += precioCentavos * cantidad;
      serviciosReservados.push({
        flight_id: flightId,
        ancillary_id: ancillaryId,
        cantidad,
        precio: precioCentavos / 100,
        iva: centavos(importe.iva) / 100,
        inventario_id: disponibilidad[0].id
      });
    }

    // Sumar los mismos centavos que se persistirán en segmentos y tributos.
    const totalVueloCentavos = pasajeros.reduce((total, pax) => total + vuelos.reduce((subtotal, v) => {
      const importes = importesPasajero(tarifasPorVuelo.get(String(v.flight_id)), pax.passenger_type || 'adult');
      return subtotal + importes.base + importes.impuestos.reduce((sum, line) => sum + line.amount, 0);
    }, 0), 0);
    const estimated_total = (totalVueloCentavos + totalAncillariesCentavos) / 100;

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
      pasajerosCreados.push({ ...pax, id: resultPax.insertId });
    }

    // Asignar segmentos de vuelo
    for (const [indicePax, pax] of pasajerosCreados.entries()) {
      for (const vuelo of vuelos) {
        const tarifa = tarifasPorVuelo.get(String(vuelo.flight_id));
        const importes = importesPasajero(tarifa, pax.passenger_type || 'adult');
        const precioUnitario = importes.base / 100;
        await FlightSegment.asignar({
          reservation_id,
          passenger_id: pax.id,
          flight_id: vuelo.flight_id,
          fare_class: tarifa.clase,
          seat: asientosPorVuelo.get(String(vuelo.flight_id))[indicePax] || null,
          fare_id: tarifa.id,
          unit_price: precioUnitario,
          total_price: precioUnitario
        }, connection);
        for (const impuesto of importes.impuestos) {
          const monto = impuesto.amount / 100;
          await connection.query(
            `INSERT INTO reservation_tax_lines (reservation_id, passenger_id, flight_id, tax_rule_id, country_id, airport_id, code, name, calculation_type, rate, taxable_amount, amount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [reservation_id, pax.id, vuelo.flight_id, impuesto.id, impuesto.country_id, impuesto.airport_id, impuesto.code, impuesto.name, impuesto.calculation_type, impuesto.value, impuesto.taxable_amount / 100, monto]
          );
        }
      }
    }

    // Reservar inventario junto con la reserva pendiente para incluir los
    // conceptos adicionales en el total y en el DTE que se emita después.
    for (const servicio of serviciosReservados) {
      const [actualizacion] = await connection.query(
        'UPDATE flight_ancillaries SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [servicio.cantidad, servicio.inventario_id, servicio.cantidad]
      );
      if (actualizacion.affectedRows !== 1) {
        throw Object.assign(new Error('El inventario de un servicio cambió. Actualiza la disponibilidad e intenta de nuevo.'), { statusCode: 409 });
      }
      for (let unidad = 0; unidad < servicio.cantidad; unidad++) {
        await connection.query(
          "INSERT INTO reservation_ancillaries (reservation_id, passenger_id, flight_id, ancillary_id, price, iva_amount, status) VALUES (?, NULL, ?, ?, ?, ?, 'active')",
          [reservation_id, servicio.flight_id, servicio.ancillary_id, servicio.precio, servicio.iva]
        );
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
        estimated_total: estimated_total,
        asientos_asignados: pasajerosCreados.flatMap((pax, indice) => vuelos.map((vuelo) => ({
          pasajero: `${pax.first_names} ${pax.last_names}`.trim(),
          vuelo: numeroVueloPorId.get(String(vuelo.flight_id)) || String(vuelo.flight_id),
          asiento: asientosPorVuelo.get(String(vuelo.flight_id))[indice]
        })))
      }
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
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
    const expirada = Number(reserva.time_limit_expired) === 1;
    if (req.usuario?.rol === 'operations') {
      const { id, pnr, status, created_at } = reserva;
      const pasajeros = (reserva.pasajeros || []).map(({ first_names, last_names, passenger_type }) => ({ first_names, last_names, passenger_type }));
      const segmentos = (reserva.segmentos || []).map(({ flight_id, flight_number, fare_class, seat, departure_datetime, arrival_datetime, origin, destination }) => ({ flight_id, flight_number, fare_class, seat, departure_datetime, arrival_datetime, origin, destination }));
      return res.json({ exito: true, datos: { id, pnr, status, created_at, expirada, pasajeros, segmentos } });
    }
    res.json({ exito: true, datos: { ...reserva, expirada } });
  } catch (error) {
    console.error('Error al consultar reserva:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const listarReservas = async (req, res) => {
  try {
    const reservas = await Reserva.listar(req.query);
    const datos = req.usuario?.rol === 'operations'
      ? reservas.map(({ id, pnr, status, created_at, total_passengers }) => ({ id, pnr, status, created_at, total_passengers }))
      : reservas;
    res.json({ exito: true, total: datos.length, datos });
  } catch (error) {
    console.error('Error al listar reservas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const cancelarReserva = async (req, res) => {
  let connection;
  try {
    const { pnr } = req.params;
    const { motivo } = req.body || {};
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [reservas] = await connection.query('SELECT id, status FROM reservations WHERE pnr = ? FOR UPDATE', [pnr.toUpperCase()]);
    const reserva = reservas[0];
    if (!reserva) {
      await connection.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    if (reserva.status === 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ error: 'La reserva ya está cancelada' });
    }
    if (reserva.status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ error: 'No se puede cancelar una reserva finalizada' });
    }
    await connection.query(
      "UPDATE reservations SET status = 'cancelled', cancellation_date = NOW(), cancellation_reason = ?, cancelled_by = ? WHERE id = ?",
      [motivo || 'Cancelación solicitada', req.usuario ? req.usuario.id : null, reserva.id]
    );
    await connection.query(
      "UPDATE payments SET status = 'cancelled' WHERE reservation_id = ? AND type = 'payment' AND status = 'pending_confirmation'",
      [reserva.id]
    );
    await cancelarServiciosReserva(reserva.id, connection);
    await FlightSegment.liberarPorReserva(reserva.id, connection);
    await connection.commit();
    res.json({ exito: true, mensaje: 'Reserva cancelada', datos: { pnr, status: 'cancelled' } });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) { /* ignore */ }
    }
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { crearReserva, consultarReserva, listarReservas, cancelarReserva };
