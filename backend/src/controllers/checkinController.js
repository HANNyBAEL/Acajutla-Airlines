const pool = require('../config/db');
const { crearMapaAsientos, errorAsientoPasajero } = require('../utils/asientos');
const { centavos } = require('../utils/money');

const FILAS_SALIDA = [12, 13];

// Todas las asignaciones (venta, reasignación y check-in automático) adquieren
// primero el mismo bloqueo por vuelo. La comprobación de ocupación posterior
// usa lectura actual para no reutilizar una instantánea antigua de InnoDB.
const bloquearVueloDelSegmento = async (conn, segmentId) => {
  const [segmentos] = await conn.query('SELECT flight_id FROM flight_segments WHERE id = ?', [segmentId]);
  if (!segmentos.length) return false;
  const [vuelos] = await conn.query('SELECT id FROM flights WHERE id = ? FOR UPDATE', [segmentos[0].flight_id]);
  return vuelos.length > 0;
};

const parseSeat = (seat) => {
  const m = /^([1-9][0-9]{0,2})([A-F])$/.exec(String(seat || '').toUpperCase());
  return m ? { fila: parseInt(m[1], 10), col: m[2] } : null;
};

const vuelosAbiertos = async (req, res) => {
  try {
    const fecha = req.query.fecha || null;
    const [rows] = await pool.query(
      `SELECT f.id, f.flight_number, f.departure_datetime, f.status, f.gate,
              ao.iata_code AS origen, ad.iata_code AS destino, at.total_capacity,
              (SELECT COUNT(*) FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
               WHERE fs.flight_id = f.id AND r.status IN ('paid','confirmed')) AS pax,
              (SELECT COUNT(*) FROM flight_segments fs WHERE fs.flight_id = f.id AND fs.checkin_status = 'checked_in') AS checked_in,
              (SELECT COUNT(*) FROM flight_segments fs WHERE fs.flight_id = f.id AND fs.checkin_status = 'boarded') AS boarded
       FROM flights f
       JOIN routes rt ON rt.id = f.route_id
       JOIN airports ao ON ao.id = rt.origin_id
       JOIN airports ad ON ad.id = rt.destination_id
       JOIN aircraft ac ON ac.id = f.aircraft_id
       JOIN aircraft_types at ON at.id = ac.type_id
       WHERE (? IS NULL OR DATE(f.departure_datetime) = ?) AND f.status <> 'cancelled'
       ORDER BY f.departure_datetime LIMIT 50`,
      [fecha, fecha]
    );
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reservaPorPnr = async (req, res) => {
  try {
    const pnrLimpio = req.params.pnr ? req.params.pnr.trim().toUpperCase() : '';
    const [r] = await pool.query('SELECT * FROM reservations WHERE pnr = ?', [pnrLimpio]);
    if (!r.length) return res.status(404).json({ error: 'Reserva no encontrada' });
    const [pax] = await pool.query(
      `SELECT p.id, p.first_names, p.last_names, p.passenger_type, p.birth_date, p.document_type, p.document_number,
              fs.id AS segment_id, fs.flight_id, fs.seat, fs.fare_class, fs.checkin_status, fs.checkin_at, fs.boarding_pass_code,
              f.flight_number, f.departure_datetime, f.gate, ao.iata_code AS origen, ad.iata_code AS destino
       FROM passengers p
       LEFT JOIN flight_segments fs ON fs.passenger_id = p.id
       LEFT JOIN flights f ON f.id = fs.flight_id
       LEFT JOIN routes rt ON rt.id = f.route_id
       LEFT JOIN airports ao ON ao.id = rt.origin_id
       LEFT JOIN airports ad ON ad.id = rt.destination_id
       WHERE p.reservation_id = ? ORDER BY f.departure_datetime, p.id`,
      [r[0].id]
    );
    res.json({ exito: true, datos: { reserva: r[0], pasajeros: pax } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const mapaAsientos = async (req, res) => {
  try {
    const [f] = await pool.query(
      `SELECT f.id, f.departure_datetime, at.total_capacity
       FROM flights f JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id
       WHERE f.id = ?`, [req.params.flightId]
    );
    if (!f.length) return res.status(404).json({ error: 'Vuelo no encontrado' });
    const filas = Math.ceil(f[0].total_capacity / 6);
    const [occ] = await pool.query(
      `SELECT fs.seat FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
       WHERE fs.flight_id = ? AND fs.seat IS NOT NULL AND r.status IN ('pending','confirmed','paid')`,
      [req.params.flightId]
    );
    res.json({ exito: true, datos: { ...crearMapaAsientos(f[0].total_capacity), ocupados: occ.map((o) => String(o.seat).trim().toUpperCase()) } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const asignarAsiento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const seat = String(req.body.seat || '').toUpperCase();
    const s = parseSeat(seat);
    if (!s) { await conn.rollback(); return res.status(400).json({ error: 'Formato de asiento inválido (ej: 12A)' }); }
    if (!await bloquearVueloDelSegmento(conn, req.params.segmentId)) {
      await conn.rollback(); return res.status(404).json({ error: 'Segmento no encontrado' });
    }
    const [fs] = await conn.query(
      `SELECT fs.*, p.passenger_type, p.birth_date, r.status AS res_status, f.status AS flight_status, f.departure_datetime, at.total_capacity
       FROM flight_segments fs
       JOIN passengers p ON p.id = fs.passenger_id
       JOIN reservations r ON r.id = fs.reservation_id
       JOIN flights f ON f.id = fs.flight_id
       JOIN aircraft ac ON ac.id = f.aircraft_id
       JOIN aircraft_types at ON at.id = ac.type_id
       WHERE fs.id = ? FOR UPDATE`,
      [req.params.segmentId]
    );
    if (!fs.length) { await conn.rollback(); return res.status(404).json({ error: 'Segmento no encontrado' }); }
    if (fs[0].checkin_status !== 'pending') { await conn.rollback(); return res.status(409).json({ error: 'El asiento no se puede cambiar después del check-in' }); }
    if (!['pending', 'confirmed', 'paid'].includes(fs[0].res_status) || !['scheduled', 'confirmed'].includes(fs[0].flight_status) || new Date(fs[0].departure_datetime) <= new Date()) {
      await conn.rollback(); return res.status(409).json({ error: 'La reserva o el vuelo ya no permiten cambiar el asiento' });
    }
    const errorAsiento = errorAsientoPasajero(seat, fs[0].total_capacity, fs[0].passenger_type, fs[0].birth_date);
    if (errorAsiento) { await conn.rollback(); return res.status(400).json({ error: errorAsiento }); }
    const [occ] = await conn.query(
      `SELECT fs.id FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
       WHERE fs.flight_id = ? AND UPPER(TRIM(fs.seat)) = ? AND fs.id <> ? AND r.status IN ('pending','confirmed','paid') FOR UPDATE`,
      [fs[0].flight_id, seat, req.params.segmentId]
    );
    if (occ.length) { await conn.rollback(); return res.status(409).json({ error: 'El asiento ' + seat + ' ya está ocupado' }); }
    await conn.query('UPDATE flight_segments SET seat = ? WHERE id = ?', [seat, req.params.segmentId]);
    await conn.commit();
    res.json({ exito: true, mensaje: 'Asiento ' + seat + ' asignado' });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
};

const hacerCheckin = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (!await bloquearVueloDelSegmento(conn, req.params.segmentId)) {
      await conn.rollback(); return res.status(404).json({ error: 'Segmento no encontrado' });
    }
    const [fs] = await conn.query(
      `SELECT fs.*, p.passenger_type, p.birth_date, r.pnr, r.status AS res_status, r.paid_total, r.estimated_total, f.status AS flight_status, f.departure_datetime, f.flight_number, at.total_capacity
       FROM flight_segments fs
       JOIN passengers p ON p.id = fs.passenger_id
       JOIN reservations r ON r.id = fs.reservation_id
       JOIN flights f ON f.id = fs.flight_id
       JOIN aircraft ac ON ac.id = f.aircraft_id
       JOIN aircraft_types at ON at.id = ac.type_id
       WHERE fs.id = ? FOR UPDATE`, [req.params.segmentId]
    );
    if (!fs.length) { await conn.rollback(); return res.status(404).json({ error: 'Segmento no encontrado' }); }
    const s = fs[0];
    if (s.res_status !== 'paid' || centavos(s.paid_total || 0) < centavos(s.estimated_total)) { await conn.rollback(); return res.status(400).json({ error: 'La reserva debe estar completamente pagada, sin saldo pendiente' }); }
    if (!['scheduled', 'confirmed', 'in_progress'].includes(s.flight_status)) { await conn.rollback(); return res.status(409).json({ error: 'El estado del vuelo no permite check-in' }); }
    
    const [crewRows] = await conn.query(
      `SELECT cm.role_operativo FROM flight_crew fc JOIN crew_members cm ON cm.id = fc.crew_member_id WHERE fc.flight_id = ? AND cm.active = 1 AND (cm.role_operativo NOT IN ('pilot','copilot') OR cm.license_expiry >= DATE(fc.duty_end))`,
      [s.flight_id]
    );
    const hasPilot = crewRows.some(c => c.role_operativo === 'pilot');
    const hasCopilot = crewRows.some(c => c.role_operativo === 'copilot');
    if (!hasPilot || !hasCopilot) {
      await conn.rollback();
      return res.status(409).json({ error: 'OP-01: Operación bloqueada. El vuelo no tiene asignada la tripulación técnica mínima (Piloto y Copiloto).' });
    }

    if (new Date(s.departure_datetime) < new Date()) { await conn.rollback(); return res.status(400).json({ error: 'El vuelo ya salió' }); }
    // Hora límite de check-in: configurable (config_params.checkin_cierre_min),
    // 45 minutos antes de la salida por defecto.
    const [cfg] = await conn.query("SELECT param_value FROM config_params WHERE param_key = 'checkin_cierre_min'");
    const cierreMin = parseInt(cfg.length ? cfg[0].param_value : '45', 10);
    const limite = new Date(new Date(s.departure_datetime).getTime() - cierreMin * 60000);
    if (new Date() > limite) {
      await conn.rollback();
      return res.status(400).json({ error: 'El check-in cerró ' + cierreMin + ' minutos antes de la salida' });
    }
    if (s.checkin_status !== 'pending') { await conn.rollback(); return res.status(400).json({ error: 'El pasajero ya tiene check-in (' + s.checkin_status + ')' }); }

    let seat = s.seat;
    if (seat) {
      const errorAsiento = errorAsientoPasajero(seat, s.total_capacity, s.passenger_type, s.birth_date);
      if (errorAsiento) { await conn.rollback(); return res.status(400).json({ error: errorAsiento }); }
      const [ocupado] = await conn.query(
        `SELECT fs.id FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
         WHERE fs.flight_id = ? AND UPPER(TRIM(fs.seat)) = ? AND fs.id <> ? AND r.status IN ('pending','confirmed','paid') FOR UPDATE`,
        [s.flight_id, seat, s.id]
      );
      if (ocupado.length) { await conn.rollback(); return res.status(409).json({ error: 'El asiento ' + seat + ' ya está ocupado' }); }
    }
    if (!seat) {
      const [occ] = await conn.query(
        `SELECT fs.seat FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
         WHERE fs.flight_id = ? AND fs.seat IS NOT NULL AND r.status IN ('pending','confirmed','paid') FOR UPDATE`, [s.flight_id]
      );
      const ocupados = new Set(occ.map((o) => String(o.seat).trim().toUpperCase()));
      seat = crearMapaAsientos(s.total_capacity).asientos.find(cand => !FILAS_SALIDA.includes(parseSeat(cand).fila) && !ocupados.has(cand));
      if (!seat) { await conn.rollback(); return res.status(409).json({ error: 'No hay asientos disponibles' }); }
      await conn.query('UPDATE flight_segments SET seat = ? WHERE id = ?', [seat, s.id]);
    }
    const bp = 'BP-' + s.pnr + '-' + seat;
    await conn.query("UPDATE flight_segments SET checkin_status = 'checked_in', checkin_at = NOW(), boarding_pass_code = ? WHERE id = ?", [bp, s.id]);
    await conn.commit();
    res.json({ exito: true, mensaje: 'Check-in completado', datos: { seat: seat, boarding_pass_code: bp } });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { conn.release(); }
};

const abordar = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [fs] = await conn.query(
      `SELECT fs.*, r.status AS res_status, r.paid_total, r.estimated_total, f.status AS flight_status
       FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
       JOIN flights f ON f.id = fs.flight_id WHERE fs.id = ? FOR UPDATE`, [req.params.segmentId]
    );
    if (!fs.length) { await conn.rollback(); return res.status(404).json({ error: 'Segmento no encontrado' }); }
    const s = fs[0];
    if (s.checkin_status !== 'checked_in') throw new Error('El pasajero debe tener check-in para abordar');
    if (s.res_status !== 'paid' || centavos(s.paid_total || 0) < centavos(s.estimated_total)) throw new Error('La reserva debe estar completamente pagada para abordar');
    if (!['scheduled', 'confirmed', 'in_progress'].includes(s.flight_status)) throw new Error('El estado del vuelo no permite abordar');
    await conn.query("UPDATE flight_segments SET checkin_status = 'boarded' WHERE id = ?", [req.params.segmentId]);
    await conn.commit();
    res.json({ exito: true, mensaje: 'Pasajero abordado' });
  } catch (e) {
    if (conn) await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally { if (conn) conn.release(); }
};

const manifiesto = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fs.id AS segment_id, fs.seat, fs.fare_class, fs.checkin_status, fs.boarding_pass_code,
              p.first_names, p.last_names, p.passenger_type, r.pnr
       FROM flight_segments fs
       JOIN passengers p ON p.id = fs.passenger_id
       JOIN reservations r ON r.id = fs.reservation_id
       WHERE fs.flight_id = ? AND r.status NOT IN ('cancelled', 'expired')
       ORDER BY fs.seat IS NULL, fs.seat`, [req.params.flightId]
    );
    const datos = req.usuario?.rol === 'operations'
      ? rows.map(({ boarding_pass_code, ...operativo }) => operativo)
      : rows;
    res.json({ exito: true, total: datos.length, datos });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const cerrarVuelo = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT gate, aircraft_id, status, arrival_datetime <= CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00') AS llego FROM flights WHERE id = ? FOR UPDATE", [req.params.id]);
    const f = rows[0];
    if (!f) throw new Error('Vuelo no encontrado');
    if (f.status !== 'in_progress' || Number(f.llego) !== 1) throw new Error('Solo se puede completar un vuelo en curso que haya llegado');
    if (!f.gate || !f.aircraft_id) throw new Error('El vuelo requiere gate y aeronave');
    const [pend] = await conn.query("SELECT COUNT(*) AS n FROM flight_segments WHERE flight_id = ? AND checkin_status = 'checked_in'", [req.params.id]);
    if (Number(pend[0].n) > 0) throw new Error('Hay pasajeros con check-in sin abordar');
    await conn.query("UPDATE flights SET status = 'completed' WHERE id = ?", [req.params.id]);
    await conn.commit();
    res.json({ exito: true, mensaje: 'Vuelo cerrado y manifiesto reconciliado' });
  } catch (e) {
    if (conn) await conn.rollback();
    res.status(409).json({ error: e.message });
  } finally { if (conn) conn.release(); }
};

const listarPasajerosPorFecha = async (req, res) => {
  try {
    const fecha = req.query.fecha;
    if (!fecha) return res.status(400).json({ error: 'Fecha requerida' });
    const [pax] = await pool.query(
      `SELECT p.id, p.first_names, p.last_names, p.passenger_type, p.birth_date, p.document_type, p.document_number,
              fs.id AS segment_id, fs.flight_id, fs.seat, fs.fare_class, fs.checkin_status, fs.checkin_at, fs.boarding_pass_code,
              f.flight_number, f.departure_datetime, f.gate, ao.iata_code AS origen, ad.iata_code AS destino,
              r.pnr
       FROM passengers p
       JOIN flight_segments fs ON fs.passenger_id = p.id
       JOIN flights f ON f.id = fs.flight_id
       JOIN routes rt ON rt.id = f.route_id
       JOIN airports ao ON ao.id = rt.origin_id
       JOIN airports ad ON ad.id = rt.destination_id
       JOIN reservations r ON r.id = p.reservation_id
       WHERE DATE(f.departure_datetime) = ? 
         AND r.status IN ('paid', 'confirmed') 
       ORDER BY f.departure_datetime, f.flight_number, p.last_names`,
      [fecha]
    );
    res.json({ exito: true, datos: pax });
  } catch (e) { 
    console.error(e);
    res.status(500).json({ error: 'Error interno' }); 
  }
};

module.exports = { vuelosAbiertos, reservaPorPnr, mapaAsientos, asignarAsiento, hacerCheckin, abordar, manifiesto, cerrarVuelo, listarPasajerosPorFecha };
