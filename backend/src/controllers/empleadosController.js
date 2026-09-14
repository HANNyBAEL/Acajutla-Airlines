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

const obtener = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query(
      `SELECT e.id, e.first_names, e.last_names, e.document_type, e.document_number, e.position,
              e.email, e.phone, e.hire_date, e.status AS emp_status,
              u.id AS user_id, u.username, u.role, u.status AS user_status, u.last_login
       FROM employees e
       LEFT JOIN users u ON u.employee_id = e.id
       WHERE e.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ exito: true, datos: rows[0] });
  } catch (error) {
    console.error('Error obtener empleado:', error);
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

const actualizar = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const id = parseInt(req.params.id, 10);
    if (!id) {
      await connection.rollback();
      return res.status(400).json({ error: 'ID de empleado inválido' });
    }

    const {
      first_names,
      last_names,
      document_type,
      document_number,
      position,
      email,
      phone,
      emp_status,
      username,
      password,
      role,
      user_status
    } = req.body;

    if (!first_names || !last_names || !document_number) {
      await connection.rollback();
      return res.status(400).json({ error: 'first_names, last_names y document_number son obligatorios' });
    }

    // Verificar si existe el empleado
    const [empRows] = await connection.query('SELECT * FROM employees WHERE id = ? FOR UPDATE', [id]);
    if (!empRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Actualizar datos del empleado
    await connection.query(
      `UPDATE employees SET
        first_names = ?,
        last_names = ?,
        document_type = ?,
        document_number = ?,
        position = ?,
        email = ?,
        phone = ?,
        status = ?
       WHERE id = ?`,
      [
        first_names,
        last_names,
        document_type || 'DUI',
        document_number,
        position || null,
        email || null,
        phone || null,
        emp_status || empRows[0].status || 'active',
        id
      ]
    );

    // Actualizar tripulación si existe vinculado
    await connection.query(
      'UPDATE crew_members SET full_name = ? WHERE employee_id = ?',
      [`${first_names} ${last_names}`, id]
    ).catch(() => {});

    // Gestionar cuenta de usuario asociada
    const [userRows] = await connection.query('SELECT * FROM users WHERE employee_id = ? FOR UPDATE', [id]);

    if (userRows.length > 0) {
      const u = userRows[0];
      const userUpdates = [];
      const userParams = [];

      if (username) {
        userUpdates.push('username = ?');
        userParams.push(username);
      }
      if (email !== undefined) {
        userUpdates.push('email = ?');
        userParams.push(email || null);
      }
      if (role) {
        userUpdates.push('role = ?');
        userParams.push(role);
        const mfaRequerido = (role === 'admin' || role === 'cashier') ? 1 : 0;
        userUpdates.push('mfa_required = ?');
        userParams.push(mfaRequerido);
      }
      if (user_status) {
        userUpdates.push('status = ?');
        userParams.push(user_status);
      }
      if (password && password.trim().length > 0) {
        if (password.length < 6) {
          await connection.rollback();
          return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const hash = await bcrypt.hash(password, 10);
        userUpdates.push('password_hash = ?', 'password_changed_at = NOW()');
        userParams.push(hash);
      }

      if (userUpdates.length > 0) {
        userParams.push(u.id);
        await connection.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
      }
    } else if (username && role) {
      // Si el empleado no tenía usuario y ahora se crea una cuenta
      if (!password || password.length < 6) {
        await connection.rollback();
        return res.status(400).json({ error: 'Para crear una cuenta de acceso la contraseña debe tener al menos 6 caracteres' });
      }
      const hash = await bcrypt.hash(password, 10);
      const mfaRequerido = (role === 'admin' || role === 'cashier') ? 1 : 0;
      await connection.query(
        `INSERT INTO users (username, email, password_hash, role, employee_id, status, mfa_enabled, mfa_required, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', 0, ?, NOW())`,
        [username, email || null, hash, role, id, mfaRequerido]
      );
    }

    await connection.commit();
    res.json({ exito: true, mensaje: 'Empleado actualizado correctamente' });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El usuario o número de documento ya existe' });
    }
    console.error('Error actualizar empleado:', error);
    res.status(500).json({ error: 'Error interno: ' + error.message });
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

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  cambiarEstado
};