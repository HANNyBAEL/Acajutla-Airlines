const pool = require('../config/db');
const Vuelo = require('../models/Vuelo');
const { obtenerImpuestos } = require('../services/taxService');
const { resolverClase } = require('../utils/fareClass');

const buscarConflictoAeronave = async ({ aircraftId, departure, arrival, turnaroundMin, excluirVueloId = null }) => {
  const condicionExclusion = excluirVueloId ? ' AND id <> ?' : '';
  const parametros = [aircraftId, departure, departure, turnaroundMin, arrival, turnaroundMin];
  if (excluirVueloId) parametros.push(excluirVueloId);
  const [vuelos] = await pool.query(
    `SELECT id, flight_number, departure_datetime, arrival_datetime
     FROM flights
     WHERE aircraft_id = ? AND status <> 'cancelled'
       AND (DATE(departure_datetime) = DATE(?)
         OR NOT (? >= DATE_ADD(arrival_datetime, INTERVAL ? MINUTE)
           OR ? <= DATE_SUB(departure_datetime, INTERVAL ? MINUTE)))${condicionExclusion}
     ORDER BY departure_datetime
     LIMIT 1`,
    parametros
  );
  return vuelos[0] || null;
};

const obtenerTurnaroundMinimo = async () => {
  const [config] = await pool.query("SELECT param_value FROM config_params WHERE param_key = 'turnaround_min'");
  const valor = parseInt(config[0]?.param_value || '45', 10);
  return Number.isFinite(valor) && valor >= 0 ? valor : 45;
};

const cotizarVuelo = async (vuelo) => {
  const impuestos = await obtenerImpuestos(vuelo.id, Number(vuelo.price || vuelo.sale_price || 0));
  return {
    ...vuelo,
    fare_price: Number(vuelo.price || vuelo.sale_price || 0),
    taxes: impuestos.lines,
    total_taxes: impuestos.total,
    total_price: Math.round((Number(vuelo.price || vuelo.sale_price || 0) + impuestos.total) * 100) / 100
  };
};

const buscarVuelos = async (req, res) => {
  try {
    const { origen, destino, fecha, clase } = req.query;
    if (!origen || !destino || !fecha) return res.status(400).json({ error: 'origen, destino y fecha son obligatorios' });
    const vuelos = await Promise.all((await Vuelo.buscarDisponibles(origen.toUpperCase(), destino.toUpperCase(), fecha, resolverClase(clase).fareCode)).map(cotizarVuelo));
    res.json({ exito: true, total: vuelos.length, datos: vuelos });
  } catch (error) {
    console.error('Error al buscar vuelos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const listarVuelos = async (req, res) => {
  try {
    const vuelos = await Vuelo.listarTodos(req.query.fecha || null);
    res.json({ exito: true, datos: vuelos });
  } catch (error) {
    console.error('Error al listar vuelos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const obtenerVuelo = async (req, res) => {
  try {
    const vuelo = await Vuelo.buscarPorId(req.params.id);
    if (!vuelo) return res.status(404).json({ error: 'Vuelo no encontrado' });
    res.json({ exito: true, datos: vuelo });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const listarAeronaves = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.registration, a.status, t.model, t.total_capacity
       FROM aircraft a LEFT JOIN aircraft_types t ON a.type_id = t.id
       ORDER BY a.registration`
    );
    res.json({ exito: true, datos: rows });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const crearVuelo = async (req, res) => {
  try {
    const { origen_iata, destino_iata, aircraft_id, flight_number, departure_datetime, arrival_datetime, base_price, gate } = req.body;
    if (!origen_iata || !destino_iata || !aircraft_id || !flight_number || !departure_datetime || !arrival_datetime || !base_price) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    const [aeronaves] = await pool.query('SELECT id, registration, status FROM aircraft WHERE id = ?', [aircraft_id]);
    if (!aeronaves.length) return res.status(400).json({ error: 'La aeronave seleccionada no existe' });
    if (!['available', 'in_flight'].includes(aeronaves[0].status)) {
      const estado = aeronaves[0].status === 'maintenance' ? 'en mantenimiento' : 'fuera de servicio';
      return res.status(409).json({ error: `La aeronave ${aeronaves[0].registration} está ${estado} y no se puede asignar a un vuelo.` });
    }
    if (origen_iata === destino_iata) return res.status(400).json({ error: 'El origen y el destino deben ser diferentes' });
    if (new Date(arrival_datetime) <= new Date(departure_datetime)) return res.status(400).json({ error: 'La llegada debe ser posterior a la salida' });
    const precioBase = Number(base_price);
    if (!Number.isFinite(precioBase) || precioBase <= 0) {
      return res.status(400).json({ error: 'El precio base debe ser mayor a 0 USD.' });
    }

    // Verificación temprana del índice único uk_flight_number_date: identificar
    // el vuelo existente evita el mensaje genérico de duplicado de MySQL.
    const [duplicado] = await pool.query(
      'SELECT id, flight_number, departure_datetime FROM flights WHERE flight_number = ? AND departure_datetime = ?',
      [flight_number.toUpperCase(), departure_datetime]
    );
    if (duplicado.length > 0) {
      return res.status(409).json({
        error: 'Ya existe el vuelo ' + flight_number.toUpperCase() + ' con esa misma fecha y hora de salida (vuelo #' + duplicado[0].id + ')',
        conflicto: { id: duplicado[0].id, flight_number: duplicado[0].flight_number, departure_datetime: duplicado[0].departure_datetime }
      });
    }

    const [origen] = await pool.query('SELECT id FROM airports WHERE iata_code = ? AND active = 1', [origen_iata.toUpperCase()]);
    const [destino] = await pool.query('SELECT id FROM airports WHERE iata_code = ? AND active = 1', [destino_iata.toUpperCase()]);
    if (origen.length === 0 || destino.length === 0) return res.status(400).json({ error: 'Aeropuerto inválido o inactivo' });

    // ===== RN-OP-02: turnaround mínimo de aeronave entre vuelos =====
    const tmin = await obtenerTurnaroundMinimo();
    const conflictoAeronave = await buscarConflictoAeronave({ aircraftId: aircraft_id, departure: departure_datetime, arrival: arrival_datetime, turnaroundMin: tmin });
    if (conflictoAeronave) {
      return res.status(409).json({
        error: `La aeronave ya tiene asignado el vuelo ${conflictoAeronave.flight_number} para esa fecha u horario. Selecciona otra fecha o aeronave.`,
        conflictoAeronave
      });
    }
    // ===== FIN RN-OP-02 =====

    const [rutas] = await pool.query('SELECT id FROM routes WHERE origin_id = ? AND destination_id = ?', [origen[0].id, destino[0].id]);
    let routeId;
    if (rutas.length > 0) {
      routeId = rutas[0].id;
    } else {
      const [nr] = await pool.query('INSERT INTO routes (origin_id, destination_id, route_code, active) VALUES (?, ?, ?, 1)', [origen[0].id, destino[0].id, origen_iata.toUpperCase() + '-' + destino_iata.toUpperCase()]);
      routeId = nr.insertId;
    }

    const connection = await pool.getConnection();
    let result;
    try {
      await connection.beginTransaction();
      [result] = await connection.query(
      'INSERT INTO flights (route_id, aircraft_id, flight_number, departure_datetime, arrival_datetime, status, base_price, gate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [routeId, aircraft_id, flight_number.toUpperCase(), departure_datetime, arrival_datetime, 'scheduled', precioBase, gate || null]
      );
      // Cada clase activa recibe su tarifa inicial = precio base × multiplicador
      // de la clase (editable desde Operaciones → Clases Tarifarias).
      const [clases] = await connection.query('SELECT id, multiplier FROM fare_classes WHERE active = 1');
      for (const clase of clases) {
        const precio = Math.round(Number(base_price) * Number(clase.multiplier || 1) * 100) / 100;
        await connection.query(
          'INSERT INTO flight_fares (flight_id, fare_class_id, price, seats_allocated, active, valid_from, created_by, updated_by) VALUES (?, ?, ?, 0, 1, NOW(), ?, ?)',
          [result.insertId, clase.id, precio, req.usuario?.id || null, req.usuario?.id || null]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
    res.status(201).json({ exito: true, datos: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      // El índice único de flights se valida arriba; si llega aquí es otro
      // duplicado (p. ej. tarifas) y conviene ver el detalle en el log.
      console.error('Duplicado al crear vuelo:', error.sqlMessage || error.message);
      return res.status(409).json({ error: 'Registro duplicado al crear el vuelo. Revisa número, fecha y hora de salida.' });
    }
    console.error('Error crear vuelo:', error);
    res.status(500).json({ error: 'Error interno: ' + (error.sqlMessage || error.message || 'Desconocido') });
  }
};

const cancelarVuelo = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const motivo = body.motivo || 'Cancelado por operaciones';
    const confirmar = body.confirmar === true;

    const [vuelos] = await connection.query('SELECT id, flight_number, status, departure_datetime FROM flights WHERE id = ? FOR UPDATE', [id]);
    if (vuelos.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Vuelo no encontrado' });
    }
    const vuelo = vuelos[0];

    if (vuelo.status === 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ error: 'El vuelo ya está cancelado' });
    }
    if (new Date(vuelo.departure_datetime) <= new Date() || vuelo.status === 'in_progress' || vuelo.status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ error: 'No se puede cancelar un vuelo en curso o finalizado' });
    }

    const [reservasAfectadas] = await connection.query(
      `SELECT DISTINCT r.id, r.pnr, r.status, r.paid_total, r.customer_id
       FROM flight_segments fs
       JOIN reservations r ON r.id = fs.reservation_id
       WHERE fs.flight_id = ? AND r.status IN ('pending','confirmed','paid') FOR UPDATE`,
      [id]
    );
    const total = reservasAfectadas.length;

    if (total > 0 && !confirmar) {
      await connection.rollback();
      return res.status(409).json({ error: 'El vuelo tiene reservas activas asociadas', afectados: total, requiereConfirmacion: true });
    }

    // 1. Cancelar el vuelo
    await connection.query("UPDATE flights SET status = 'cancelled' WHERE id = ?", [id]);

    // 2. Procesar reservas afectadas: cancelar, liberar segmentos y procesar reembolsos
    let userId = null;
    if (req.usuario && req.usuario.id) {
      const [u] = await connection.query('SELECT id FROM users WHERE id = ?', [req.usuario.id]);
      if (u.length) userId = req.usuario.id;
    }

    let totalReembolsado = 0;
    const reembolsosDetalle = [];

    for (const resItem of reservasAfectadas) {
      await connection.query(
        `UPDATE reservations SET status = 'cancelled', cancellation_date = NOW(),
         cancellation_reason = ?, cancelled_by = ? WHERE id = ?`,
        ['Cancelación de vuelo ' + vuelo.flight_number + ': ' + motivo, userId, resItem.id]
      );

      await connection.query('DELETE FROM flight_segments WHERE flight_id = ? AND reservation_id = ?', [id, resItem.id]);

      // Si tiene pagos aprobados, registrar reembolso
      const [pagos] = await connection.query(
        `SELECT id, amount, currency, external_reference FROM payments
         WHERE reservation_id = ? AND status = 'approved' AND type = 'payment' FOR UPDATE`,
        [resItem.id]
      );

      for (const pago of pagos) {
        const monto = parseFloat(pago.amount);
        await connection.query(
          `INSERT INTO payments (reservation_id, original_payment_id, method, amount, currency, status, type, external_reference, reason, processed_by, payment_date)
           VALUES (?, ?, 'cash', ?, ?, 'refunded', 'refund', ?, ?, ?, NOW())`,
          [
            resItem.id,
            pago.id,
            monto,
            pago.currency || 'USD',
            pago.external_reference ? 'REFUND-' + pago.external_reference : null,
            'Reembolso automático por cancelación de vuelo ' + vuelo.flight_number,
            userId
          ]
        );
        totalReembolsado += monto;
        reembolsosDetalle.push({ reservation_id: resItem.id, pnr: resItem.pnr, amount: monto });
      }

      if (pagos.length > 0) {
        await connection.query('UPDATE reservations SET paid_total = 0 WHERE id = ?', [resItem.id]);
      }
    }

    await connection.commit();

    // 3. Notificar a los pasajeros (asíncrono, post-commit)
    for (const resItem of reservasAfectadas) {
      try {
        const mailerService = require('../services/mailerService');
        await mailerService.enviarCancelacionVuelo(resItem.id, vuelo, motivo);
      } catch (errMail) {
        console.error('Error al encolar notificación de cancelación para ' + resItem.pnr + ':', errMail.message);
      }
    }

    res.json({
      exito: true,
      mensaje: 'Vuelo ' + vuelo.flight_number + ' cancelado correctamente y reservas gestionadas',
      datos: {
        id: id,
        flight_number: vuelo.flight_number,
        reservasAfectadas: total,
        reembolsosGenerados: reembolsosDetalle.length,
        totalReembolsado: Math.round(totalReembolsado * 100) / 100,
        motivo: motivo
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error cancelar vuelo:', error);
    res.status(500).json({ error: 'Error interno al cancelar el vuelo: ' + error.message });
  } finally {
    connection.release();
  }
};

const reprogramarVuelo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { departure_datetime, arrival_datetime, aircraft_id, gate } = req.body || {};

    const [vuelos] = await pool.query('SELECT id, aircraft_id, flight_number, status, departure_datetime FROM flights WHERE id = ?', [id]);
    if (vuelos.length === 0) return res.status(404).json({ error: 'Vuelo no encontrado' });
    const vuelo = vuelos[0];

    if (new Date(vuelo.departure_datetime) <= new Date() || vuelo.status === 'in_progress' || vuelo.status === 'completed') {
      return res.status(400).json({ error: 'No se puede reprogramar un vuelo en curso o finalizado' });
    }
    if (!departure_datetime || !arrival_datetime) {
      return res.status(400).json({ error: 'Indique la nueva fecha de salida y de llegada' });
    }
    if (new Date(arrival_datetime) <= new Date(departure_datetime)) {
      return res.status(400).json({ error: 'La llegada debe ser posterior a la salida' });
    }

    const aeronaveDestino = aircraft_id || vuelo.aircraft_id;
    const [aeronaves] = await pool.query('SELECT id, registration, status FROM aircraft WHERE id = ?', [aeronaveDestino]);
    if (!aeronaves.length) return res.status(400).json({ error: 'La aeronave seleccionada no existe' });
    if (!['available', 'in_flight'].includes(aeronaves[0].status)) {
      const estado = aeronaves[0].status === 'maintenance' ? 'en mantenimiento' : 'fuera de servicio';
      return res.status(409).json({ error: `La aeronave ${aeronaves[0].registration} está ${estado} y no se puede asignar a un vuelo.` });
    }
    const tmin = await obtenerTurnaroundMinimo();
    const conflictoAeronave = await buscarConflictoAeronave({
      aircraftId: aeronaveDestino,
      departure: departure_datetime,
      arrival: arrival_datetime,
      turnaroundMin: tmin,
      excluirVueloId: id
    });
    if (conflictoAeronave) {
      return res.status(409).json({
        error: `La aeronave ya tiene asignado el vuelo ${conflictoAeronave.flight_number} para esa fecha u horario. Selecciona otra fecha o aeronave.`,
        conflictoAeronave
      });
    }

    const nuevoStatus = vuelo.status === 'cancelled' ? 'scheduled' : vuelo.status;
    const campos = ['departure_datetime = ?', 'arrival_datetime = ?', 'status = ?'];
    const vals = [departure_datetime, arrival_datetime, nuevoStatus];
    if (aircraft_id) { campos.push('aircraft_id = ?'); vals.push(aircraft_id); }
    if (gate) { campos.push('gate = ?'); vals.push(gate); }
    vals.push(id);
    await pool.query('UPDATE flights SET ' + campos.join(', ') + ' WHERE id = ?', vals);

    try {
      await pool.query(
        'UPDATE flights SET observations = ? WHERE id = ?',
        ['Reprogramado el ' + new Date().toLocaleString('es-SV') + '. Salida original: ' + new Date(vuelo.departure_datetime).toLocaleString('es-SV') + '. Estado previo: ' + vuelo.status, id]
      );
    } catch (e) { /* columna observations opcional */ }

    res.json({ exito: true, mensaje: 'Vuelo ' + vuelo.flight_number + ' reprogramado', datos: { id: id, flight_number: vuelo.flight_number, nuevo_estado: nuevoStatus } });
  } catch (error) {
    console.error('Error reprogramar vuelo:', error);
    res.status(500).json({ error: 'Error interno al reprogramar: ' + (error.sqlMessage || error.message || 'Desconocido') });
  }
};

const buscarItinerarios = async (req, res) => {
  try {
    const { origen, destino, fecha, clase = 'economy' } = req.query;
    const fareCode = resolverClase(clase).fareCode;
    if (!origen || !destino || !fecha) return res.status(400).json({ error: 'origen, destino y fecha son obligatorios' });
    const o = origen.toUpperCase(); const d = destino.toUpperCase();
    const dur = (a, b) => Math.round((new Date(b) - new Date(a)) / 60000);
    const addMin = (s, m) => new Date(new Date(s).getTime() + m * 60000).toISOString().slice(0, 19).replace('T', ' ');
    const SQL_VUELO = `SELECT f.id, f.flight_number, f.departure_datetime, f.arrival_datetime, f.base_price,
              ff.id AS fare_id, ff.price AS sale_price, ff.price AS price, fc.code AS fare_class,
              ao.iata_code AS origin_iata, ad.iata_code AS destination_iata, at.model AS aircraft_model, at.total_capacity,
              (at.total_capacity - COALESCE((SELECT COUNT(*) FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id WHERE fs.flight_id = f.id AND r.status IN ('pending','confirmed','paid')), 0)) AS available_seats
       FROM flights f JOIN routes rt ON rt.id = f.route_id
       JOIN airports ao ON ao.id = rt.origin_id JOIN airports ad ON ad.id = rt.destination_id
       JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id
       JOIN flight_fares ff ON ff.flight_id = f.id AND ff.active = 1 AND (ff.valid_to IS NULL OR ff.valid_to > NOW())
       JOIN fare_classes fc ON fc.id = ff.fare_class_id AND fc.code = ? AND fc.active = 1`;
    const directos = (await Promise.all((await Vuelo.buscarDisponibles(o, d, fecha, fareCode)).map(cotizarVuelo)))
      .map((v) => Object.assign({}, v, { tipo: 'directo', duracion_min: dur(v.departure_datetime, v.arrival_datetime), base_price: v.total_price, vuelos: [v] }));
    const conexiones = [];
    const [legs1] = await pool.query(SQL_VUELO + ` WHERE ao.iata_code = ? AND ad.iata_code <> ? AND DATE(f.departure_datetime) = ? AND f.status IN ('scheduled','confirmed') AND ao.active = 1 AND ad.active = 1 ORDER BY f.departure_datetime LIMIT 15`, [fareCode, o, d, fecha]);
    for (const l1 of legs1) {
      if (conexiones.length >= 6) break;
      const [legs2] = await pool.query(SQL_VUELO + ` WHERE ao.iata_code = ? AND ad.iata_code = ? AND f.departure_datetime BETWEEN ? AND ? AND f.status IN ('scheduled','confirmed') AND ao.active = 1 AND ad.active = 1 ORDER BY f.departure_datetime LIMIT 5`, [fareCode, l1.destination_iata, d, addMin(l1.arrival_datetime, 45), addMin(l1.arrival_datetime, 360)]);
      for (const l2 of legs2) {
        const [tramo1, tramo2] = await Promise.all([cotizarVuelo(l1), cotizarVuelo(l2)]);
        conexiones.push({ tipo: 'conexion', escala_en: l1.destination_iata, layover_min: dur(l1.arrival_datetime, l2.departure_datetime), duracion_min: dur(l1.departure_datetime, l2.arrival_datetime), base_price: tramo1.total_price + tramo2.total_price, available_seats: Math.min(l1.available_seats, l2.available_seats), vuelos: [tramo1, tramo2] });
      }
    }
    conexiones.sort((a, b) => a.duracion_min - b.duracion_min);
    res.json({ exito: true, datos: { directos: directos, conexiones: conexiones.slice(0, 5) } });
  } catch (error) {
    console.error('Error buscar itinerarios:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { buscarVuelos, listarVuelos, obtenerVuelo, listarAeronaves, crearVuelo, cancelarVuelo, reprogramarVuelo, buscarItinerarios };
