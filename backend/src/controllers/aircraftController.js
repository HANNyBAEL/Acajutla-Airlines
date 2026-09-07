const pool = require('../config/db');

const listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.registration, a.serial_number, a.status, a.manufacture_year,
              a.last_maintenance_date, a.next_maintenance_date,
              t.id AS type_id, t.model, t.manufacturer, t.total_capacity
       FROM aircraft a
       LEFT JOIN aircraft_types t ON a.type_id = t.id
       ORDER BY a.registration`
    );
    res.json({ exito: true, datos: rows });
  } catch (error) {
    console.error('Error listar aeronaves:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const listarTipos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.model, t.manufacturer, t.total_capacity,
              (SELECT COUNT(*) FROM aircraft a WHERE a.type_id = t.id) AS aircraft_count
       FROM aircraft_types t
       ORDER BY t.manufacturer, t.model`
    );
    res.json({ exito: true, datos: rows });
  } catch (error) {
    console.error('Error listar tipos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const crear = async (req, res) => {
  try {
    const { registration, serial_number, type_id, status, manufacture_year } = req.body;
    if (!registration || !type_id) {
      return res.status(400).json({ error: 'registration y type_id son obligatorios' });
    }
    const [result] = await pool.query(
      `INSERT INTO aircraft (registration, serial_number, type_id, status, manufacture_year, last_maintenance_date)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [registration.toUpperCase(), serial_number || null, type_id, status || 'available', manufacture_year || null]
    );
    res.status(201).json({ exito: true, datos: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una aeronave con esa matrícula' });
    console.error('Error crear aeronave:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const crearTipo = async (req, res) => {
  try {
    const { model, manufacturer, total_capacity } = req.body;
    if (!model || !manufacturer || !total_capacity) {
      return res.status(400).json({ error: 'model, manufacturer y total_capacity son obligatorios' });
    }
    const capacidad = parseInt(total_capacity, 10);
    if (isNaN(capacidad) || capacidad <= 0) {
      return res.status(400).json({ error: 'La capacidad debe ser un número mayor a 0' });
    }
    const [result] = await pool.query(
      'INSERT INTO aircraft_types (model, manufacturer, total_capacity) VALUES (?, ?, ?)',
      [model, manufacturer, capacidad]
    );
    res.status(201).json({ exito: true, datos: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe ese modelo de aeronave' });
    console.error('Error crear tipo:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listar: listar, listarTipos: listarTipos, crear: crear, crearTipo: crearTipo };