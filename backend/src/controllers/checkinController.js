const pool = require('../config/db');

const FILAS_SALIDA = [12, 13];
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];

const edadAnios = (birth) => {
  if (!birth) return null;
  const b = new Date(birth);
  const hoy = new Date();
  let e = hoy.getFullYear() - b.getFullYear();
  const m = hoy.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < b.getDate())) e--;
  return e;
};

const parseSeat = (seat) => {
  const m = /^([1-9][0-9]?)([A-F])$/.exec(String(seat || '').toUpperCase());
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
       WHERE (? IS NULL OR DATE(f.departure_datetime) = ?) AND f.status IN ('scheduled','confirmed','delayed')
       ORDER BY f.departure_datetime LIMIT 50`,
      [fecha, fecha]
    );
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reservaPorPnr = async (req, res) => {
  try {
    const [r] = await pool.query('SELECT * FROM reservations WHERE pnr = ?', [req.params.pnr.toUpperCase()]);
    if (!r.length) return res.status(404).json({ error: 'Reserva no encontrada' });
    const [pax] = await pool.query(
      `SELECT p.id, p.first_names, p.last_names, p.passenger_type, p.birth_date, p.document_type, p.document_number,
              fs.id AS segment_id, fs.flight_id, fs.seat, fs.fare_class, fs.checkin_status, fs.checkin_at, fs.boarding_pass_code,
              f.flight_number, f.departure_datetime, f.gate, ao.iata_code AS origen, ad.iata_code AS destino
       FROM passengers p
       JOIN flight_segments fs ON fs.passenger_id = p.id
       JOIN flights f ON f.id = fs.flight_id
       JOIN routes rt ON rt.id = f.route_id
       JOIN airports ao ON ao.id = rt.origin_id
       JOIN airports ad ON ad.id = rt.destination_id
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
       WHERE fs.flight_id = ? AND fs.seat IS NOT NULL AND r.status NOT IN ('cancelled', 'expired')`,
      [req.params.flightId]
    );
    res.json({ exito: true, datos: { capacidad: f[0].total_capacity, filas: filas, columnas: COLS, filasSalida: FILAS_SALIDA.filter((x) => x <= filas), ocupados: occ.map((o) => o.seat) } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const asignarAsiento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const seat = String(req.body.seat || '').toUpperCase();
    const s = parseSeat(seat);
    if (!s) { await conn.rollback(); return res.status(400).json({ error: 'Formato de asiento inválido (ej: 12A)' }); }
    // FOR UPDATE sobre el segmento serializa asignaciones de asiento
    // concurrentes sobre el mismo vuelo.
    const [fs] = await conn.query(
      `SELECT fs.*, p.passenger_type, p.birth_date, f.departure_datetime, at.total_capacity
       FROM flight_segments fs
       JOIN passengers p ON p.id = fs.passenger_id
       JOIN flights f ON f.id = fs.flight_id
       JOIN aircraft ac ON ac.id = f.aircraft_id
       JOIN aircraft_types at ON at.id = ac.type_id
       WHERE fs.id = ? FOR UPDATE`,
      [req.params.segmentId]
    );
    if (!fs.length) { await conn.rollback(); return res.status(404).json({ error: 'Segmento no encontrado' }); }
    const filas = Math.ceil(fs[0].total_capacity / 6);
    if (s.fila > filas) { await conn.rollback(); return res.status(400).json({ error: 'La fila no existe en esta aeronave' }); }
    if (FILAS_SALIDA.includes(s.fila)) {
      if (fs[0].passenger_type !== 'adult') { await conn.rollback(); return res.status(400).json({ error: 'RN-OP-03: Solo adultos pueden ocupar filas de salida de emergencia' }); }
      const e = edadAnios(fs[0].birth_date);
      if (e === null || e < 15) { await conn.rollback(); return res.status(400).json({ error: 'RN-OP-03: Salida de emergencia requiere adulto mayor de 15 años' }); }
    }
    const [occ] = await conn.query(
      `SELECT fs.id FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
       WHERE fs.flight_id = ? AND fs.seat = ? AND fs.id <> ? AND r.status IN ('pending','confirmed','paid')`,
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
    const [fs] = await conn.query(
      `SELECT fs.*, r.pnr, r.status AS res_status, f.departure_datetime, f.flight_number, at.total_capacity
       FROM flight_segments fs
       JOIN reservations r ON r.id = fs.reservation_id
       JOIN flights f ON f.id = fs.flight_id
       JOIN aircraft ac ON ac.id = f.aircraft_id
       JOIN aircraft_types at ON at.id = ac.type_id
       WHERE fs.id = ? FOR UPDATE`, [req.params.segmentId]
    );
    if (!fs.length) { await conn.rollback(); return res.status(404).json({ error: 'Segmento no encontrado' }); }
    const s = fs[0];
    if (!['paid', 'confirmed'].includes(s.res_status)) { await conn.rollback(); return res.status(400).json({ error: 'La reserva debe estar pagada o confirmada' }); }
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
    if (!seat) {
      const filas = Math.ceil(s.total_capacity / 6);
      const [occ] = await conn.query(
        `SELECT fs.seat FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
         WHERE fs.flight_id = ? AND fs.seat IS NOT NULL AND r.status IN ('pending','confirmed','paid')`, [s.flight_id]
      );
      const ocupados = new Set(occ.map((o) => o.seat));
      exterior:
      for (let fila = 1; fila <= filas; fila++) {
        if (FILAS_SALIDA.includes(fila)) continue;
        for (const c of COLS) {
          const cand = fila + c;
          if (!ocupados.has(cand)) { seat = cand; break exterior; }
        }
      }
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
  try {
    const [fs] = await pool.query('SELECT checkin_status FROM flight_segments WHERE id = ?', [req.params.segmentId]);
    if (!fs.length) return res.status(404).json({ error: 'Segmento no encontrado' });
    if (fs[0].checkin_status !== 'checked_in') return res.status(400).json({ error: 'El pasajero debe tener check-in para abordar' });
    await pool.query("UPDATE flight_segments SET checkin_status = 'boarded' WHERE id = ?", [req.params.segmentId]);
    res.json({ exito: true, mensaje: 'Pasajero abordado' });
  } catch (e) { res.status(400).json({ error: e.message }); }
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
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const cerrarVuelo = async (req, res) => {
  try {
    const [pend] = await pool.query(
      "SELECT COUNT(*) AS n FROM flight_segments WHERE flight_id = ? AND checkin_status = 'checked_in'", [req.params.id]
    );
    if (pend[0].n > 0) return res.status(409).json({ error: 'RN-OP-01: Hay ' + pend[0].n + ' pasajero(s) con check-in sin abordar. No se puede cerrar el vuelo.' });
    await pool.query("UPDATE flights SET status = 'completed' WHERE id = ?", [req.params.id]);
    res.json({ exito: true, mensaje: 'Vuelo cerrado y manifiesto reconciliado' });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

module.exports = { vuelosAbiertos, reservaPorPnr, mapaAsientos, asignarAsiento, hacerCheckin, abordar, manifiesto, cerrarVuelo };