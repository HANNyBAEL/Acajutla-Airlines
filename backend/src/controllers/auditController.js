const pool = require('../config/db');

const fechaValida = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
};

const listar = async (req, res) => {
  try {
    const { modulo, resultado, accion, usuario, recurso, desde, hasta, limite } = req.query;
    let sql = 'SELECT al.*, u.role AS usuario_rol FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
    const vals = [];
    if (modulo) { sql += ' AND al.module = ?'; vals.push(modulo); }
    if (resultado) { sql += ' AND al.result = ?'; vals.push(resultado); }
    if (accion) { sql += ' AND al.action LIKE ?'; vals.push('%' + accion + '%'); }
    if (usuario) { sql += ' AND (al.user_name LIKE ? OR u.username LIKE ?)'; vals.push('%' + usuario + '%', '%' + usuario + '%'); }
    if (recurso) { sql += ' AND al.resource_id LIKE ?'; vals.push('%' + recurso + '%'); }
    if (fechaValida(desde)) { sql += ' AND al.timestamp >= ?'; vals.push(desde + ' 00:00:00'); }
    if (fechaValida(hasta)) { sql += ' AND al.timestamp < DATE_ADD(?, INTERVAL 1 DAY)'; vals.push(hasta + ' 00:00:00'); }
    sql += ' ORDER BY al.timestamp DESC, al.id DESC LIMIT ?';
    const limiteSolicitado = Number.parseInt(limite, 10);
    vals.push(Number.isInteger(limiteSolicitado) ? Math.max(1, Math.min(limiteSolicitado, 500)) : 200);
    const [rows] = await pool.query(sql, vals);
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) {
    console.error('Error auditoria listar:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const estadisticas = async (req, res) => {
  try {
    const diasSolicitados = Number.parseInt(req.query.dias, 10);
    const dias = Number.isInteger(diasSolicitados) ? Math.max(1, Math.min(diasSolicitados, 365)) : 7;
    const [porAccion] = await pool.query(
      "SELECT action, module, result, COUNT(*) AS total FROM audit_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY action, module, result ORDER BY total DESC LIMIT 20",
      [dias]
    );
    const [porDia] = await pool.query(
      "SELECT DATE(timestamp) AS dia, COUNT(*) AS total FROM audit_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(timestamp) ORDER BY dia",
      [dias]
    );
    const [porUsuario] = await pool.query(
      "SELECT user_id, user_name, COUNT(*) AS total, SUM(result = 'fallo') AS fallos FROM audit_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY user_id, user_name ORDER BY total DESC LIMIT 10",
      [dias]
    );
    const [totales] = await pool.query(
      "SELECT COUNT(*) AS total, SUM(result = 'exito') AS exitos, SUM(result = 'fallo') AS fallos, COUNT(DISTINCT user_id) AS usuarios_activos FROM audit_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)",
      [dias]
    );
    res.json({ exito: true, datos: { porAccion, porDia, porUsuario, totales: totales[0] } });
  } catch (e) {
    console.error('Error auditoria stats:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const modulos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL AND TRIM(module) <> '' ORDER BY module"
    );
    res.json({ exito: true, datos: rows.map((row) => row.module) });
  } catch (e) {
    console.error('Error auditoria módulos:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listar: listar, estadisticas: estadisticas, modulos: modulos };
