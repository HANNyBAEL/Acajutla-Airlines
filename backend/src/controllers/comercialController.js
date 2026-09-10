const pool = require('../config/db');

// ---------- WAITLIST ----------
const listarWaitlist = async (req, res) => {
  try {
    const { flight_id, status } = req.query;
    let sql = 'SELECT w.*, f.flight_number FROM waitlist w JOIN flights f ON f.id = w.flight_id WHERE 1=1';
    const params = [];
    if (flight_id) { sql += ' AND w.flight_id = ?'; params.push(flight_id); }
    if (status) { sql += ' AND w.status = ?'; params.push(status); }
    sql += ' ORDER BY w.position ASC, w.id ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const agregarWaitlist = async (req, res) => {
  try {
    const { flight_id, passenger_name, passenger_email, passenger_doc, doc_type, requested_class, notes } = req.body;
    if (!flight_id || !passenger_name) return res.status(400).json({ error: 'Vuelo y nombre son obligatorios' });
    const [v] = await pool.query(
      `SELECT f.id, f.flight_number, at.total_capacity,
        (SELECT COUNT(DISTINCT fs.passenger_id) FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
         WHERE fs.flight_id = f.id AND r.status IN ('paid','confirmed')) AS ocupados
       FROM flights f JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id
       WHERE f.id = ?`, [flight_id]);
    if (!v.length) return res.status(404).json({ error: 'Vuelo no encontrado' });
    if (v[0].ocupados < v[0].total_capacity) {
      return res.status(409).json({ error: 'El vuelo aún tiene asientos disponibles; no requiere lista de espera', disponibles: v[0].total_capacity - v[0].ocupados });
    }
    const [max] = await pool.query("SELECT COALESCE(MAX(position),0) AS m FROM waitlist WHERE flight_id = ? AND status = 'waiting'", [flight_id]);
    const posicion = max[0].m + 1;
    const [r] = await pool.query(
      'INSERT INTO waitlist (flight_id, passenger_name, passenger_email, passenger_doc, doc_type, requested_class, notes, position) VALUES (?,?,?,?,?,?,?,?)',
      [flight_id, passenger_name, passenger_email || null, passenger_doc || null, doc_type || null, requested_class || null, notes || null, posicion]);
    res.status(201).json({ exito: true, datos: { id: r.insertId, posicion: posicion }, mensaje: 'Agregado a lista de espera en posición #' + posicion });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const actualizarWaitlist = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['waiting','offered','confirmed','notified','expired','cancelled'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });
    const extra = status === 'notified' ? ', notified_at = NOW()' : '';
    await pool.query('UPDATE waitlist SET status = ?' + extra + ' WHERE id = ?', [status, req.params.id]);
    res.json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

// ---------- ANCILLARIES ----------
const listarAncillaries = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ancillaries ORDER BY type, code');
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crearAncillary = async (req, res) => {
  try {
    const { code, name, type, description, base_price } = req.body;
    if (!code || !name || !type || base_price === undefined) return res.status(400).json({ error: 'code, name, type y base_price son obligatorios' });
    const [r] = await pool.query('INSERT INTO ancillaries (code, name, type, description, base_price) VALUES (?,?,?,?,?)',
      [code.toUpperCase(), name, type, description || null, base_price]);
    res.status(201).json({ exito: true, datos: { id: r.insertId } });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
};

const asignarAncillaryVuelo = async (req, res) => {
  try {
    const { flight_id, ancillary_id, stock, price_override } = req.body;
    if (!flight_id || !ancillary_id || stock === undefined) return res.status(400).json({ error: 'flight_id, ancillary_id y stock son obligatorios' });
    await pool.query(
      'INSERT INTO flight_ancillaries (flight_id, ancillary_id, stock, price_override) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE stock = VALUES(stock), price_override = VALUES(price_override)',
      [flight_id, ancillary_id, stock, price_override || null]);
    res.status(201).json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const ancillariesDeVuelo = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fa.*, a.code, a.name, a.type, a.description, COALESCE(fa.price_override, a.base_price) AS precio_final
       FROM flight_ancillaries fa JOIN ancillaries a ON a.id = fa.ancillary_id
       WHERE fa.flight_id = ? AND fa.active = 1 AND a.active = 1 ORDER BY a.type, a.code`, [req.params.flightId]);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const agregarAncillaryReserva = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { reservation_id, passenger_id, flight_id, ancillary_id, quantity } = req.body;
    const qty = Math.max(1, parseInt(quantity || 1, 10));
    if (!reservation_id || !flight_id || !ancillary_id) { await conn.rollback(); return res.status(400).json({ error: 'Faltan datos obligatorios' }); }
    const [fa] = await conn.query('SELECT * FROM flight_ancillaries WHERE flight_id = ? AND ancillary_id = ? AND active = 1 FOR UPDATE', [flight_id, ancillary_id]);
    if (!fa.length) { await conn.rollback(); return res.status(404).json({ error: 'Ancillary no disponible para este vuelo' }); }
    if (fa[0].stock < qty) { await conn.rollback(); return res.status(409).json({ error: 'Stock insuficiente' }); }
    const [a] = await conn.query('SELECT base_price FROM ancillaries WHERE id = ?', [ancillary_id]);
    const precio = fa[0].price_override || a[0].base_price;
    const total = precio * qty;
    const [r] = await conn.query(
      'INSERT INTO reservation_ancillaries (reservation_id, passenger_id, flight_id, ancillary_id, price, status) VALUES (?,?,?,?,?,\'active\')',
      [reservation_id, passenger_id || null, flight_id, ancillary_id, total]);
    await conn.query('UPDATE flight_ancillaries SET stock = stock - ? WHERE id = ?', [qty, fa[0].id]);
    await conn.query('UPDATE reservations SET estimated_total = estimated_total + ? WHERE id = ?', [total, reservation_id]);
    await conn.commit();
    res.status(201).json({ exito: true, datos: { id: r.insertId, precio: precio, total: total }, mensaje: 'Servicio agregado y sumado al total' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: 'Error interno' });
  } finally { conn.release(); }
};

const ancillariesDeReserva = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ra.*, a.code, a.name, a.type FROM reservation_ancillaries ra JOIN ancillaries a ON a.id = ra.ancillary_id
       WHERE ra.reservation_id = ? ORDER BY ra.id`, [req.params.reservationId]);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

// ---------- REPORTES ----------
const kpi = async (req, res) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const [vh] = await pool.query('SELECT status, COUNT(*) AS c FROM flights WHERE DATE(departure_datetime) = ? GROUP BY status', [hoy]);
    const map = {}; vh.forEach((x) => { map[x.status] = x.c; });
    const [pax] = await pool.query('SELECT COUNT(DISTINCT p.id) AS t FROM passengers p JOIN reservations r ON r.id = p.reservation_id WHERE r.created_at >= (NOW() - INTERVAL 24 HOUR)');
    const [cap] = await pool.query(
      `SELECT SUM(at.total_capacity) AS cap, COALESCE(SUM(oc.n),0) AS ocu FROM flights f
       JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id
       LEFT JOIN (SELECT flight_id, COUNT(DISTINCT passenger_id) AS n FROM flight_segments GROUP BY flight_id) oc ON oc.flight_id = f.id
       WHERE DATE(f.departure_datetime) = ?`, [hoy]);
    const [ventas] = await pool.query("SELECT COALESCE(SUM(amount),0) AS t FROM payments WHERE status='approved' AND type='payment' AND DATE(payment_date) = ?", [hoy]);
    const [dte] = await pool.query("SELECT COALESCE(SUM(transmission_status='accepted'),0) AS ok, COALESCE(SUM(transmission_status='rejected'),0) AS bad, COALESCE(SUM(transmission_status='contingency'),0) AS cont FROM dte_headers WHERE DATE(emission_date) = ?", [hoy]);
    const [wl] = await pool.query("SELECT COUNT(*) AS t FROM waitlist WHERE status='waiting'");
    res.json({ exito: true, datos: {
      vuelosHoy: { programados: map.scheduled || 0, en_curso: map.in_progress || 0, completados: map.completed || 0, cancelados: map.cancelled || 0 },
      pax24h: pax[0].t, ocupacionHoy: cap[0].cap ? Math.round((cap[0].ocu / cap[0].cap) * 100) : 0,
      ventasHoy: Number(ventas[0].t), dtesHoy: { emitidos: Number(dte[0].ok), rechazados: Number(dte[0].bad), contingencia_pendiente: Number(dte[0].cont) },
      waitlistActivas: wl[0].t
    } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteOcupacion = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let sql = `SELECT r.route_code, COUNT(DISTINCT f.id) AS vuelos, SUM(at.total_capacity) AS capacidad_total, COALESCE(SUM(oc.n),0) AS ocupados
       FROM flights f JOIN routes r ON r.id = f.route_id JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id
       LEFT JOIN (SELECT flight_id, COUNT(DISTINCT passenger_id) AS n FROM flight_segments GROUP BY flight_id) oc ON oc.flight_id = f.id
       WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND DATE(f.departure_datetime) >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND DATE(f.departure_datetime) <= ?'; params.push(hasta); }
    sql += ' GROUP BY r.id ORDER BY (COALESCE(SUM(oc.n),0)/SUM(at.total_capacity)) DESC';
    const [rows] = await pool.query(sql, params);
    rows.forEach((x) => { x.ocupacion_pct = x.capacidad_total ? Math.round((x.ocupados / x.capacidad_total) * 1000) / 10 : 0; });
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteAncillaries = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.code, a.name, a.type, COUNT(ra.id) AS vendidos, COALESCE(SUM(ra.price),0) AS ingresos
       FROM reservation_ancillaries ra JOIN ancillaries a ON a.id = ra.ancillary_id WHERE ra.status='active'
       GROUP BY a.id ORDER BY ingresos DESC`);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteCanales = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COALESCE(r.channel,'web') AS canal, COUNT(DISTINCT r.id) AS reservas, COALESCE(SUM(p.amount),0) AS ingresos
       FROM reservations r LEFT JOIN payments p ON p.reservation_id = r.id AND p.status='approved' AND p.type='payment'
       GROUP BY canal ORDER BY ingresos DESC`);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteConciliacion = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const [pagos] = await pool.query("SELECT DATE(payment_date) AS fecha, COALESCE(SUM(amount),0) AS pagos FROM payments WHERE status='approved' AND type='payment' AND (? IS NULL OR DATE(payment_date) >= ?) AND (? IS NULL OR DATE(payment_date) <= ?) GROUP BY DATE(payment_date)", [desde || null, desde || null, hasta || null, hasta || null]);
    const [dtes] = await pool.query("SELECT DATE(emission_date) AS fecha, COALESCE(SUM(total_to_pay),0) AS facturado FROM dte_headers WHERE transmission_status='accepted' AND (? IS NULL OR DATE(emission_date) >= ?) AND (? IS NULL OR DATE(emission_date) <= ?) GROUP BY DATE(emission_date)", [desde || null, desde || null, hasta || null, hasta || null]);
    const mapa = {};
    pagos.forEach((p) => { mapa[p.fecha] = { fecha: p.fecha, pagos: Number(p.pagos), facturado: 0 }; });
    dtes.forEach((d) => { if (!mapa[d.fecha]) mapa[d.fecha] = { fecha: d.fecha, pagos: 0, facturado: 0 }; mapa[d.fecha].facturado = Number(d.facturado); });
    const filas = Object.values(mapa).map((m) => { const dif = Number((m.pagos - m.facturado).toFixed(2)); return Object.assign({}, m, { diferencia: dif, estado: Math.abs(dif) < 0.01 ? 'OK' : 'DISCREPANCIA' }); });
    filas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    res.json({ exito: true, datos: filas });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

module.exports = {
  listarWaitlist, agregarWaitlist, actualizarWaitlist,
  listarAncillaries, crearAncillary, asignarAncillaryVuelo, ancillariesDeVuelo, agregarAncillaryReserva, ancillariesDeReserva,
  kpi, reporteOcupacion, reporteAncillaries, reporteCanales, reporteConciliacion
};