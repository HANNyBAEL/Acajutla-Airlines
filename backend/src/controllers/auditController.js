const pool = require('../config/db');

const listar = async (req, res) => {
  try {
    const { modulo, resultado, accion, usuario, limite } = req.query;
    let sql = 'SELECT al.*, u.role AS usuario_rol FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
    const vals = [];
    if (modulo) { sql += ' AND al.modulo = ?'; vals.push(modulo); }
    if (resultado) { sql += ' AND al.result = ?'; vals.push(resultado); }
    if (accion) { sql += ' AND al.action LIKE ?'; vals.push('%' + accion + '%'); }
    if (usuario) { sql += ' AND (al.user_name LIKE ? OR u.username LIKE ?)'; vals.push('%' + usuario + '%', '%' + usuario + '%'); }
    sql += ' ORDER BY al.timestamp DESC LIMIT ?';
    vals.push(parseInt(limite, 10) || 100);
    const [rows] = await pool.query(sql, vals);
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) {
    console.error('Error auditoria listar:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const estadisticas = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias, 10) || 7;
    const [porAccion] = await pool.query(
      "SELECT action, module, result, COUNT(*) AS total FROM audit_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY action, module, result ORDER BY total DESC LIMIT 20",
      [dias]
    );
    const [porDia] = await pool.query(
      "SELECT DATE(timestamp) AS dia, COUNT(*) AS total FROM audit_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(timestamp) ORDER BY dia",
      [dias]
    );
    const [totales] = await pool.query(
      "SELECT COUNT(*) AS total, SUM(result = 'exito') AS exitos, SUM(result = 'fallo') AS fallos, COUNT(DISTINCT user_id) AS usuarios_activos FROM audit_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)",
      [dias]
    );
    res.json({ exito: true, datos: { porAccion: porAccion, porDia: porDia, totales: totales[0] } });
  } catch (e) {
    console.error('Error auditoria stats:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listar: listar, estadisticas: estadisticas };