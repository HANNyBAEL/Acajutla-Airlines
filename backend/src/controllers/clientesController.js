const pool = require('../config/db');

const listarClientes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, first_names, last_names, document_type, document_number, birth_date, email, phone FROM customers ORDER BY id DESC LIMIT 50'
    );
    res.json({ exito: true, datos: rows });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const crearCliente = async (req, res) => {
  try {
    const { first_names, last_names, document_type = 'DUI', document_number, birth_date, email, phone } = req.body;
    if (!first_names || !last_names || !birth_date) {
      return res.status(400).json({ error: 'first_names, last_names y birth_date son requeridos' });
    }
    const fechaNacimiento = new Date(birth_date + 'T00:00:00');
    if (Number.isNaN(fechaNacimiento.getTime()) || fechaNacimiento > new Date()) {
      return res.status(400).json({ error: 'birth_date debe ser una fecha válida que no sea futura' });
    }
    const [result] = await pool.query(
      `INSERT INTO customers (first_names, last_names, document_type, document_number, birth_date, email, phone, status, registration_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [first_names, last_names, document_type, document_number || null, birth_date, email || null, phone || null]
    );
    res.status(201).json({ exito: true, datos: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El cliente ya existe (documento o email duplicado)' });
    }
    res.status(500).json({ error: 'Error interno' });
  }
};

const actualizarCliente = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { first_names, last_names, document_type = 'DUI', document_number, birth_date, email, phone } = req.body;
    if (!id || !first_names || !last_names || !birth_date) {
      return res.status(400).json({ error: 'first_names, last_names y birth_date son requeridos' });
    }
    const fechaNacimiento = new Date(birth_date + 'T00:00:00');
    if (Number.isNaN(fechaNacimiento.getTime()) || fechaNacimiento > new Date()) {
      return res.status(400).json({ error: 'birth_date debe ser una fecha válida que no sea futura' });
    }
    const [result] = await pool.query(
      `UPDATE customers SET first_names = ?, last_names = ?, document_type = ?, document_number = ?,
       birth_date = ?, email = ?, phone = ? WHERE id = ?`,
      [first_names, last_names, document_type, document_number || null, birth_date, email || null, phone || null, id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ exito: true, datos: { id } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El documento o correo ya pertenece a otro cliente' });
    res.status(500).json({ error: 'Error interno' });
  }
};

const buscar = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ exito: true, datos: [] });
    const like = '%' + q + '%';
    const [rows] = await pool.query(
      `SELECT id, first_names, last_names, document_type, document_number, birth_date, email, phone
       FROM customers
       WHERE first_names LIKE ? OR last_names LIKE ? OR CONCAT(first_names,' ',last_names) LIKE ? OR document_number LIKE ? OR email LIKE ?
       ORDER BY first_names LIMIT 10`,
      [like, like, like, like, like]
    );
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};
module.exports = { listarClientes, crearCliente, actualizarCliente, buscar };
