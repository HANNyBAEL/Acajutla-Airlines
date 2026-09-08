const pool = require('../config/db');

const getParam = async (key, def) => {
  const [r] = await pool.query('SELECT param_value FROM config_params WHERE param_key = ?', [key]);
  return r.length ? r[0].param_value : def;
};

// ========== WAITLIST ==========
const listarWaitlist = async (req, res) => {
  try {
    const { flight_id, status } = req.query;
    let sql = `SELECT w.*, f.flight_number, r.route_code
               FROM waitlist w
               JOIN flights f ON f.id = w.flight_id
               LEFT JOIN routes r ON r.id = f.route_id
               WHERE 1=1`;
    const params = [];
    if (flight_id) { sql += ' AND w.flight_id = ?'; params.push(flight_id); }
    if (status) { sql += ' AND w.status = ?'; params.push(status); }
    sql += ' ORDER BY w.position ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const agregarWaitlist = async (req, res) => {
  try {
    const { flight_id, passenger_name, passenger_email, passenger_doc, doc_type, requested_class } = req.body;
    if (!flight_id || !passenger_name) return res.status(400).json({ error: 'Vuelo y nombre son obligatorios' });

    // Verificar capacidad real antes de aceptar waitlist
    const [vuelo] = await pool.query(
      `SELECT f.id, f.flight_number, f.aircraft_id, t.total_capacity,
              (SELECT COUNT(DISTINCT fs.passenger_id) FROM flight_segments fs WHERE fs.flight_id = f.id) AS ocupados
       FROM flights f JOIN aircraft a ON a.id = f.aircraft_id JOIN aircraft_types t ON t.id = a.type_id
       WHERE f.id = ?`, [flight_id]);
    if (!vuelo.length) return res.status(404).json({ error: 'Vuelo no encontrado' });
    const v = vuelo[0];

    if (v.ocupados < v.total_capacity) {
      return res.status(409).json({ error: 'El vuelo aún tiene asientos disponibles, no requiere waitlist', asientosDisponibles: v.total_capacity - v.ocupados });
    }

    const [max] = await pool.query('SELECT COALESCE(MAX(position),0) AS m FROM waitlist WHERE flight_id = ? AND status = ?', [flight_id, 'waiting']);
    const posicion = max[0].m + 1;
    const [r] = await pool.query(
      'INSERT INTO waitlist (flight_id, passenger_name, passenger_email, passenger_doc, doc_type, requested_class, position) VALUES (?,?,?,?,?,?,?)',
      [flight_id, passenger_name, passenger_email || null, passenger_doc || null, doc_type || null, requested_class || null, posicion]
    );
    res.status(201).json({ exito: true, datos: { id: r.insertId, posicion: posicion }, mensaje: 'Agregado a lista de espera en posición #' + posicion });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const notificarWaitlist = async (req, res) => {
  try {
    const { id } = req.params;
    const [r] = await pool.query('UPDATE waitlist SET status = ?, notified_at = NOW() WHERE id = ? AND status = ?', ['notified', id, 'waiting']);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Entrada no encontrada o ya procesada' });
    // Simular envío de correo
    res.json({ exito: true, mensaje: 'Notificación enviada al pasajero (correo simulado)' });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const cancelarWaitlist = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE waitlist SET status = ? WHERE id = ?', ['cancelled', id]);
    res.json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

// Auto-liberar waitlist cuando se cancela una reserva (llamado desde reservas)
const liberarWaitlistPorVuelo = async (flightId) => {
  try {
    const [first] = await pool.query(
      'SELECT id, passenger_name, passenger_email FROM waitlist WHERE flight_id = ? AND status = ? ORDER BY position ASC LIMIT 1',
      [flightId, 'waiting']);
    if (!first.length) return null;
    await pool.query('UPDATE waitlist SET status = ?, notified_at = NOW() WHERE id = ?', ['notified', first[0].id]);
    return first[0];
  } catch (e) { return null; }
};

// ========== ANCILLARIES ==========
const listarAncillaries = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ancillaries ORDER BY type, code');
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crearAncillary = async (req, res) => {
  try {
    const { code, name, type, description, base_price } = req.body;
    if (!code || !name || !type || base_price === undefined) return res.status(400).json({ error: 'Código, nombre, tipo y precio son obligatorios' });
    const [r] = await pool.query(
      'INSERT INTO ancillaries (code, name, type, description, base_price) VALUES (?,?,?,?,?)',
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
    if (!flight_id || !ancillary_id || stock === undefined) return res.status(400).json({ error: 'Vuelo, ancillary y stock son obligatorios' });
    await pool.query(
      'INSERT INTO flight_ancillaries (flight_id, ancillary_id, stock, price_override) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE stock = VALUES(stock), price_override = VALUES(price_override)',
      [flight_id, ancillary_id, stock, price_override || null]);
    res.status(201).json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const ancillariesDeVuelo = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fa.*, a.code, a.name, a.type, a.description,
              COALESCE(fa.price_override, a.base_price) AS precio_final
       FROM flight_ancillaries fa
       JOIN ancillaries a ON a.id = fa.ancillary_id
       WHERE fa.flight_id = ? AND fa.active = 1 AND a.active = 1
       ORDER BY a.type, a.code`, [req.params.flightId]);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const agregarAncillaryReserva = async (req, res) => {
  try {
    const { reservation_id, passenger_id, flight_id, ancillary_id } = req.body;
    if (!reservation_id || !flight_id || !ancillary_id) return res.status(400).json({ error: 'Faltan datos obligatorios' });

    // RN-COM-03: validar stock disponible
    const [fa] = await pool.query('SELECT * FROM flight_ancillaries WHERE flight_id = ? AND ancillary_id = ? AND active = 1', [flight_id, ancillary_id]);
    if (!fa.length) return res.status(404).json({ error: 'Ancillary no disponible para este vuelo' });
    if (fa[0].stock <= 0) return res.status(409).json({ error: 'Sin stock disponible' });

    const [a] = await pool.query('SELECT base_price FROM ancillaries WHERE id = ?', [ancillary_id]);
    const precio = fa[0].price_override || a[0].base_price;

    await pool.query(
      'INSERT INTO reservation_ancillaries (reservation_id, passenger_id, flight_id, ancillary_id, price) VALUES (?,?,?,?,?)',
      [reservation_id, passenger_id || null, flight_id, ancillary_id, precio]);
    await pool.query('UPDATE flight_ancillaries SET stock = stock - 1 WHERE id = ?', [fa[0].id]);

    res.status(201).json({ exito: true, datos: { precio: precio }, mensaje: 'Servicio adicional agregado' });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const ancillariesDeReserva = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ra.*, a.code, a.name, a.type
       FROM reservation_ancillaries ra
       JOIN ancillaries a ON a.id = ra.ancillary_id
       WHERE ra.reservation_id = ? ORDER BY a.type`, [req.params.reservationId]);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

// ========== REPORTES ==========
const reporteOcupacion = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let sql = `SELECT r.route_code, r.origin_id, r.destination_id,
                      COUNT(DISTINCT f.id) AS vuelos,
                      SUM(t.total_capacity) AS capacidad_total,
                      COALESCE(SUM(fs_count.ocupados), 0) AS ocupados,
                      ROUND(COALESCE(SUM(fs_count.ocupados) * 100.0 / NULLIF(SUM(t.total_capacity),0), 0), 1) AS ocupacion_pct
               FROM flights f
               JOIN routes r ON r.id = f.route_id
               JOIN aircraft a ON a.id = f.aircraft_id
               JOIN aircraft_types t ON t.id = a.type_id
               LEFT JOIN (SELECT flight_id, COUNT(DISTINCT passenger_id) AS ocupados FROM flight_segments GROUP BY flight_id) fs_count ON fs_count.flight_id = f.id
               WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND f.departure_datetime >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND f.departure_datetime <= ?'; params.push(hasta); }
    sql += ' GROUP BY r.id ORDER BY ocupacion_pct DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteConciliacion = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let sql = `SELECT DATE(p.created_at) AS fecha,
                      COUNT(DISTINCT p.id) AS pagos,
                      COALESCE(SUM(p.amount), 0) AS total_pagos,
                      COUNT(DISTINCT d.id) AS dtes,
                      COALESCE(SUM(d.total_amount), 0) AS total_dtes,
                      COALESCE(SUM(p.amount), 0) - COALESCE(SUM(d.total_amount), 0) AS diferencia
               FROM payments p
               LEFT JOIN dte_headers d ON d.reservation_id = p.reservation_id AND d.transmission_status != 'invalidated'
               WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND p.created_at >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND p.created_at <= ?'; params.push(hasta); }
    sql += ' GROUP BY DATE(p.created_at) ORDER BY fecha DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteAncillaries = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let sql = `SELECT a.code, a.name, a.type,
                      COUNT(ra.id) AS vendidos,
                      COALESCE(SUM(ra.price), 0) AS ingresos,
                      (SELECT COUNT(*) FROM flight_ancillaries fa WHERE fa.ancillary_id = a.id) AS stock_configurado
               FROM reservation_ancillaries ra
               JOIN ancillaries a ON a.id = ra.ancillary_id
               WHERE ra.status = 'active'`;
    const params = [];
    if (desde) { sql += ' AND ra.created_at >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND ra.created_at <= ?'; params.push(hasta); }
    sql += ' GROUP BY a.id ORDER BY ingresos DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteCanales = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let sql = `SELECT COALESCE(r.channel, 'web') AS canal,
                      COUNT(DISTINCT r.id) AS reservas,
                      COALESCE(SUM(p.amount), 0) AS ingresos
               FROM reservations r
               LEFT JOIN payments p ON p.reservation_id = r.id
               WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND r.created_at >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND r.created_at <= ?'; params.push(hasta); }
    sql += ' GROUP BY COALESCE(r.channel, "web") ORDER BY ingresos DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const dashboardKPIs = async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const [vuelosHoy] = await pool.query(
      `SELECT status, COUNT(*) AS c FROM flights WHERE DATE(departure_datetime) = ? GROUP BY status`, [hoy]);
    const [pax24h] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total FROM passengers p JOIN reservations r ON r.id = p.reservation_id WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`);
    const [ocpHoy] = await pool.query(
      `SELECT SUM(t.total_capacity) AS cap, COALESCE(SUM(fs.ocupados), 0) AS ocu
       FROM flights f
       JOIN aircraft a ON a.id = f.aircraft_id
       JOIN aircraft_types t ON t.id = a.type_id
       LEFT JOIN (SELECT flight_id, COUNT(DISTINCT passenger_id) AS ocupados FROM flight_segments GROUP BY flight_id) fs ON fs.flight_id = f.id
       WHERE DATE(f.departure_datetime) = ?`, [hoy]);
    const [ventasHoy] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE DATE(created_at) = ?`, [hoy]);
    const [dteHoy] = await pool.query(
      `SELECT transmission_status, COUNT(*) AS c FROM dte_headers WHERE DATE(created_at) = ? GROUP BY transmission_status`, [hoy]);
    const [contingencia] = await pool.query(
      `SELECT COUNT(*) AS c FROM dte_headers WHERE transmission_status = 'contingency'`);
    const [waitActivas] = await pool.query(
      `SELECT COUNT(*) AS c FROM waitlist WHERE status = 'waiting'`);

    const map = (rows, key) => { const o = {}; rows.forEach((r) => o[r[key]] = r.c); return o; };
    const vh = map(vuelosHoy, 'status');
    const dh = map(dteHoy, 'transmission_status');

    const cap = ocpHoy[0].cap || 0;
    const ocu = ocpHoy[0].ocu || 0;

    res.json({
      exito: true,
      datos: {
        vuelosHoy: {
          programados: vh.scheduled || 0,
          en_curso: vh.in_progress || 0,
          completados: vh.completed || 0,
          cancelados: vh.cancelled || 0,
          retrasados: vh.delayed || 0
        },
        pax24h: pax24h[0].total || 0,
        ocupacionHoy: cap > 0 ? Math.round(ocu * 100 / cap) : 0,
        ventasHoy: Number(ventasHoy[0].total) || 0,
        dtesHoy: {
          emitidos: (dh.transmitted || 0) + (dh.contingency || 0),
          rechazados: dh.rejected || 0,
          contingencia_pendiente: contingencia[0].c || 0
        },
        waitlistActivas: waitActivas[0].c || 0
      }
    });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

module.exports = {
  listarWaitlist, agregarWaitlist, notificarWaitlist, cancelarWaitlist, liberarWaitlistPorVuelo,
  listarAncillaries, crearAncillary, asignarAncillaryVuelo, ancillariesDeVuelo,
  agregarAncillaryReserva, ancillariesDeReserva,
  reporteOcupacion, reporteConciliacion, reporteAncillaries, reporteCanales, dashboardKPIs
};