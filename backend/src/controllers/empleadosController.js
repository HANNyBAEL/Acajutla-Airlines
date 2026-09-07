const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.first_names, e.last_names, e.document_type, e.document_number, e.position,
              e.email, e.phone, e.hire_date, e.status AS emp_status,
              u.id AS user_id, u.username, u.role, u.status AS user_status, u.last_login
       FROM employees e
       LEFT JOIN users u ON u.employee_id = e.id
       ORDER BY e.id DESC`
    );
    res.json({ exito: true, datos: rows });
  } catch (error) {
    console.error('Error listar empleados:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const crear = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { first_names, last_names, document_type, document_number, position, email, phone, username, password, role } = req.body;
    if (!first_names || !last_names || !document_number) {
      await connection.rollback();
      return res.status(400).json({ error: 'first_names, last_names y document_number son obligatorios' });
    }

    const [rEmp] = await connection.query(
      `INSERT INTO employees (first_names, last_names, document_type, document_number, position, email, phone, hire_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active')`,
      [first_names, last_names, document_type || 'DUI', document_number, position || null, email || null, phone || null]
    );

    let userId = null;
    if (username && password && role) {
      const hash = await bcrypt.hash(password, 10);
      const mfaRequerido = (role === 'admin' || role === 'cashier') ? 1 : 0;
      const [rUser] = await connection.query(
        `INSERT INTO users (username, email, password_hash, role, employee_id, status, mfa_enabled, mfa_required, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', 0, ?, NOW())`,
        [username, email || null, hash, role, rEmp.insertId, mfaRequerido]
      );
      userId = rUser.insertId;
    }

    await connection.commit();
    res.status(201).json({ exito: true, datos: { id: rEmp.insertId, user_id: userId } });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El usuario o número de documento ya existe' });
    console.error('Error crear empleado:', error);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    connection.release();
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'inactive', 'blocked', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    res.json({ exito: true });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listar: listar, crear: crear, cambiarEstado: cambiarEstado };