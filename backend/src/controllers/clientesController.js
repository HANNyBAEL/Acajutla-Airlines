const pool = require('../config/db');

const listarClientes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, first_names, last_names, document_type, document_number, email, phone FROM customers ORDER BY id DESC LIMIT 50'
    );
    res.json({ exito: true, datos: rows });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const crearCliente = async (req, res) => {
  try {
    const { first_names, last_names, document_type = 'DUI', document_number, email, phone } = req.body;
    if (!first_names || !last_names || !document_number) {
      return res.status(400).json({ error: 'first_names, last_names y document_number son requeridos' });
    }
    const [result] = await pool.query(
      `INSERT INTO customers (first_names, last_names, document_type, document_number, email, phone, status, registration_date)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [first_names, last_names, document_type, document_number, email || null, phone || null]
    );
    res.status(201).json({ exito: true, datos: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El cliente ya existe (documento o email duplicado)' });
    }
    res.status(500).json({ error: 'Error interno' });
  }
};

const buscar = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ exito: true, datos: [] });
    const like = '%' + q + '%';
    const [rows] = await pool.query(
      `SELECT id, first_names, last_names, document_type, document_number, email, phone
       FROM customers
       WHERE first_names LIKE ? OR last_names LIKE ? OR CONCAT(first_names,' ',last_names) LIKE ? OR document_number LIKE ? OR email LIKE ?
       ORDER BY first_names LIMIT 10`,
      [like, like, like, like, like]
    );
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};
module.exports = { listarClientes, crearCliente, buscar };