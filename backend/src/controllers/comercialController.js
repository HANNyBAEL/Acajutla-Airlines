const pool = require('../config/db');

const listarServicios = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ancillary_services ORDER BY active DESC, name');
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crearServicio = async (req, res) => {
  try {
    const { code, name, description, price, tipo } = req.body;
    if (!code || !name || price === undefined) return res.status(400).json({ error: 'code, name y price son obligatorios' });
    const [r] = await pool.query('INSERT INTO ancillary_services (code,name,description,price,tipo,active) VALUES (?,?,?,?,?,1)', [code, name, description || null, price, tipo || 'other']);
    res.status(201).json({ exito: true, datos: { id: r.insertId } });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
};

const listarServiciosReserva = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT rs.*, s.code, s.name, s.tipo FROM reservation_services rs JOIN ancillary_services s ON s.id = rs.service_id WHERE rs.reservation_id = ? ORDER BY rs.id', [req.params.id]);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const agregarServicioReserva = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { service_id, passenger_id, quantity } = req.body;
    const qty = Math.max(1, parseInt(quantity || 1, 10));
    const [resv] = await conn.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!resv.length) { await conn.rollback(); return res.status(404).json({ error: 'Reserva no encontrada' }); }
    if (resv[0].status === 'cancelled') { await conn.rollback(); return res.status(400).json({ error: 'La reserva está cancelada' }); }
    const [srv] = await conn.query('SELECT * FROM ancillary_services WHERE id = ? AND active = 1', [service_id]);
    if (!srv.length) { await conn.rollback(); return res.status(404).json({ error: 'Servicio no encontrado o inactivo' }); }
    const total = Number(srv[0].price) * qty;
    const [ins] = await conn.query('INSERT INTO reservation_services (reservation_id, passenger_id, service_id, quantity, unit_price, total) VALUES (?,?,?,?,?,?)', [req.params.id, passenger_id || null, service_id, qty, srv[0].price, total]);
    await conn.query('UPDATE reservations SET estimated_total = estimated_total + ? WHERE id = ?', [total, req.params.id]);
    await conn.commit();
    res.status(201).json({ exito: true, datos: { id: ins.insertId, total: total } });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: 'Error interno' });
  } finally { conn.release(); }
};

const listarWaitlist = async (req, res) => {
  try {
    const { flight_id } = req.query;
    let sql = 'SELECT w.*, f.flight_number, f.departure_datetime FROM waitlist w JOIN flights f ON f.id = w.flight_id';
    const params = [];
    if (flight_id) { sql += ' WHERE w.flight_id = ?'; params.push(flight_id); }
    sql += ' ORDER BY w.created_at';
    const [rows] = await pool.query(sql, params);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crearWaitlist = async (req, res) => {
  try {
    const { flight_id, customer_id, passenger_name, contact, notes } = req.body;
    if (!flight_id) return res.status(400).json({ error: 'flight_id es obligatorio' });
    const [r] = await pool.query("INSERT INTO waitlist (flight_id, customer_id, passenger_name, contact, notes, status) VALUES (?,?,?,?,?,'waiting')", [flight_id, customer_id || null, passenger_name || null, contact || null, notes || null]);
    res.status(201).json({ exito: true, datos: { id: r.insertId } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const actualizarWaitlist = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['waiting', 'offered', 'confirmed', 'expired'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });
    await pool.query('UPDATE waitlist SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

module.exports = { listarServicios, crearServicio, listarServiciosReserva, agregarServicioReserva, listarWaitlist, crearWaitlist, actualizarWaitlist };