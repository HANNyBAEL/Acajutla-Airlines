const pool = require('../config/db');
const DTEService = require('../services/dteService');

const emitir = async (req, res) => {
  try {
    const { reservation_id, tipo_dte, receptor } = req.body;
    if (!reservation_id || !tipo_dte) return res.status(400).json({ error: 'reservation_id y tipo_dte son obligatorios' });
    const r = await DTEService.emitirDTE({ reservation_id: reservation_id, tipo_dte: tipo_dte, receptor: receptor });
    res.status(201).json({
      exito: true,
      mensaje: r.estado === 'accepted' ? 'DTE emitido y sellado por MH' : 'DTE generado pero RECHAZADO por MH',
      datos: r
    });
  } catch (e) {
    console.error('Error emitir DTE:', e);
    res.status(400).json({ error: e.message });
  }
};

const listar = async (req, res) => {
  try {
    let sql = `SELECT h.*, r.pnr FROM dte_headers h LEFT JOIN reservations r ON r.id = h.reservation_id WHERE 1=1`;
    const vals = [];
    if (req.query.tipo) { sql += ' AND h.dte_type = ?'; vals.push(req.query.tipo); }
    if (req.query.estado) { sql += ' AND h.transmission_status = ?'; vals.push(req.query.estado); }
    sql += ' ORDER BY h.id DESC LIMIT 200';
    const [rows] = await pool.query(sql, vals);
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const obtener = async (req, res) => {
  try {
    const [h] = await pool.query('SELECT h.*, r.pnr FROM dte_headers h LEFT JOIN reservations r ON r.id = h.reservation_id WHERE h.uuid_generation = ?', [req.params.uuid]);
    if (h.length === 0) return res.status(404).json({ error: 'DTE no encontrado' });
    const [items] = await pool.query('SELECT * FROM dte_items WHERE header_id = ? ORDER BY item_number', [h[0].id]);
    res.json({ exito: true, datos: Object.assign({}, h[0], { items: items }) });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const kpis = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(transmission_status = 'accepted') AS aceptados,
              SUM(transmission_status = 'rejected') AS rechazados,
              SUM(transmission_status = 'transmitted') AS pendientes,
              SUM(CASE WHEN DATE(emission_date) = CURDATE() THEN total_to_pay ELSE 0 END) AS facturado_hoy
       FROM dte_headers`
    );
    res.json({ exito: true, datos: rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { emitir: emitir, listar: listar, obtener: obtener, kpis: kpis };