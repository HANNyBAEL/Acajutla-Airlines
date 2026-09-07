const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const ROLES_VALIDOS = ['admin', 'operations', 'cashier', 'airport_staff', 'customer', 'corporate_agent', 'auditor'];

const Usuario = {
  buscarPorCredencial: async (credencial) => {
    const [rows] = await pool.query(
      `SELECT u.*, e.first_names AS empleado_nombres, e.last_names AS empleado_apellidos, e.position AS empleado_cargo
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       WHERE (u.username = ? OR u.email = ?) AND u.status = 'active'`,
      [credencial, credencial]
    );
    return rows[0];
  },

  buscarPorId: async (id) => {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.role, u.status, u.mfa_enabled, u.created_at, u.last_login,
              e.first_names AS empleado_nombres, e.last_names AS empleado_apellidos, e.position AS empleado_cargo
       FROM users u
       LEFT JOIN employees e ON u.employee_id = e.id
       WHERE u.id = ?`,
      [id]
    );
    return rows[0];
  },

  crear: async (data) => {
    const { username, email, password, role = 'customer', employee_id = null, mfa_enabled = false } = data;

    if (!ROLES_VALIDOS.includes(role)) {
      throw new Error(`Rol inválido. Permitidos: ${ROLES_VALIDOS.join(', ')}`);
    }

    const [existentes] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existentes.length > 0) {
      throw new Error('El usuario o correo ya están registrados');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const mfaRequerido = ['admin', 'cashier'].includes(role);

    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, employee_id, mfa_enabled, mfa_required, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [username, email, passwordHash, role, employee_id, mfa_enabled, mfaRequerido]
    );

    return { id: result.insertId, username, email, role };
  },

  verificarPassword: async (passwordPlano, passwordHash) => {
    return bcrypt.compare(passwordPlano, passwordHash);
  },

  actualizarUltimoLogin: async (id) => {
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
  },

  incrementarIntentosFallidos: async (id) => {
    await pool.query(`UPDATE users SET failed_attempts = failed_attempts + 1, last_failed_attempt = NOW() WHERE id = ?`, [id]);
  },

  resetearIntentosFallidos: async (id) => {
    await pool.query('UPDATE users SET failed_attempts = 0, last_failed_attempt = NULL WHERE id = ?', [id]);
  },

  bloquearUsuario: async (id) => {
    await pool.query(`UPDATE users SET blocked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = ?`, [id]);
  },

  estaBloqueado: async (id) => {
    const [rows] = await pool.query('SELECT blocked_until FROM users WHERE id = ?', [id]);
    if (!rows[0] || !rows[0].blocked_until) return false;
    return new Date(rows[0].blocked_until) > new Date();
  },

  guardarRefreshToken: async (userId, tokenHash, expiraEn) => {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
    await pool.query(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, NOW())`, [userId, tokenHash, expiraEn]);
  },

  validarRefreshToken: async (userId, tokenHash) => {
    const [rows] = await pool.query(`SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()`, [userId, tokenHash]);
    return rows[0];
  },

  revocarRefreshToken: async (userId) => {
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  },

  generarCodigoMFA: async (userId) => {
    const codigo = crypto.randomInt(100000, 999999).toString();
    const expiraEn = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
      `INSERT INTO mfa_codes (user_id, code, expires_at, created_at) VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at)`,
      [userId, codigo, expiraEn]
    );
    return codigo;
  },

  verificarCodigoMFA: async (userId, codigo) => {
    const [rows] = await pool.query(`SELECT * FROM mfa_codes WHERE user_id = ? AND code = ? AND expires_at > NOW() AND used = FALSE`, [userId, codigo]);
    if (rows.length === 0) return false;
    await pool.query('UPDATE mfa_codes SET used = TRUE WHERE id = ?', [rows[0].id]);
    return true;
  },

  listar: async (filtros = {}) => {
    let sql = `SELECT u.id, u.username, u.email, u.role, u.status, u.mfa_enabled, u.created_at, u.last_login,
                      e.first_names AS empleado_nombres, e.last_names AS empleado_apellidos
               FROM users u LEFT JOIN employees e ON u.employee_id = e.id WHERE 1=1`;
    const valores = [];
    if (filtros.role) { sql += ' AND u.role = ?'; valores.push(filtros.role); }
    if (filtros.status) { sql += ' AND u.status = ?'; valores.push(filtros.status); }
    sql += ' ORDER BY u.created_at DESC LIMIT 100';
    const [rows] = await pool.query(sql, valores);
    return rows;
  }
};

module.exports = { Usuario, ROLES_VALIDOS };