const pool = require('../config/db');

const listarPaises = async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM countries ORDER BY name');
  res.json({ exito: true, datos: rows });
};
const crearPais = async (req, res) => {
  const { code, name } = req.body;
  if (!/^[A-Za-z]{2}$/.test(code || '') || !name) return res.status(400).json({ error: 'Código ISO de 2 letras y nombre son obligatorios' });
  try {
    const [r] = await pool.query('INSERT INTO countries (code, name) VALUES (?, ?)', [code.toUpperCase(), name]);
    res.status(201).json({ exito: true, datos: { id: r.insertId } });
  } catch (e) { if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El país ya existe' }); res.status(500).json({ error: 'Error interno' }); }
};
const listarReglas = async (_req, res) => {
  const [rows] = await pool.query(`SELECT tr.*, c.code AS country_code, c.name AS country_name, a.iata_code AS airport_code
    FROM tax_rules tr JOIN countries c ON c.id = tr.country_id LEFT JOIN airports a ON a.id = tr.airport_id
    ORDER BY c.name, tr.airport_id IS NULL DESC, tr.code, tr.valid_from DESC`);
  res.json({ exito: true, datos: rows });
};
const crearRegla = async (req, res) => {
  const { country_id, airport_id, code, name, calculation_type, value, applies_to } = req.body;
  if (!country_id || !code || !name || !['percentage', 'fixed'].includes(calculation_type) || !Number.isFinite(Number(value)) || Number(value) < 0) return res.status(400).json({ error: 'Complete país, código, nombre, tipo y valor válido' });
  const [country] = await pool.query('SELECT id FROM countries WHERE id = ? AND active = 1', [country_id]);
  if (!country.length) return res.status(404).json({ error: 'País no encontrado o inactivo' });
  if (airport_id) {
    const [airport] = await pool.query('SELECT id FROM airports WHERE id = ? AND country_id = ?', [airport_id, country_id]);
    if (!airport.length) return res.status(400).json({ error: 'El aeropuerto debe pertenecer al país seleccionado' });
  }
  const [r] = await pool.query(`INSERT INTO tax_rules (country_id, airport_id, code, name, calculation_type, value, applies_to, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [country_id, airport_id || null, code.toUpperCase(), name, calculation_type, value, applies_to || 'all', req.usuario?.id || null, req.usuario?.id || null]);
  res.status(201).json({ exito: true, datos: { id: r.insertId } });
};
const cambiarRegla = async (req, res) => {
  const { active } = req.body;
  if (active === undefined) return res.status(400).json({ error: 'Debe indicar active' });
  await pool.query('UPDATE tax_rules SET active = ?, updated_by = ? WHERE id = ?', [active ? 1 : 0, req.usuario?.id || null, req.params.id]);
  res.json({ exito: true });
};
module.exports = { listarPaises, crearPais, listarReglas, crearRegla, cambiarRegla };
