const pool = require('../config/db');

const AuditLog = {
  registrar: async (data) => {
    const { usuario_id, usuario_nombre, accion, modulo, recurso_id, detalle, ip, user_agent, resultado } = data;
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, user_name, action, module, resource_id, details, ip, user_agent, result, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [usuario_id, usuario_nombre, accion, modulo, recurso_id, detalle ? JSON.stringify(detalle) : null, ip, user_agent, resultado]
      );
    } catch (error) {
      console.error('❌ [AuditLog] Error al registrar:', error.message);
    }
  },

  listar: async (filtros = {}) => {
    let sql = `SELECT al.*, u.role AS usuario_rol FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const valores = [];
    if (filtros.usuario_id) { sql += ' AND al.user_id = ?'; valores.push(filtros.usuario_id); }
    if (filtros.accion) { sql += ' AND al.action = ?'; valores.push(filtros.accion); }
    if (filtros.modulo) { sql += ' AND al.module = ?'; valores.push(filtros.modulo); }
    if (filtros.resultado) { sql += ' AND al.result = ?'; valores.push(filtros.resultado); }
    sql += ' ORDER BY al.timestamp DESC LIMIT ?';
    valores.push(filtros.limite || 100);
    const [rows] = await pool.query(sql, valores);
    return rows;
  }
};

module.exports = AuditLog;