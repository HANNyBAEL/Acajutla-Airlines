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
  const [rows] = await pool.query(`SELECT tr.*, c.code AS country_code, c.name AS country_name,
      a.iata_code AS airport_code, a.name AS airport_name
    FROM tax_rules tr JOIN countries c ON c.id = tr.country_id LEFT JOIN airports a ON a.id = tr.airport_id
    ORDER BY c.name, tr.airport_id IS NULL DESC, tr.code, tr.valid_from DESC`);
  res.json({ exito: true, datos: rows });
};
const listarReferencias = async (_req, res) => {
  const [rows] = await pool.query(`SELECT ref.*, c.code AS country_code, c.name AS country_name,
      a.iata_code AS airport_code, a.name AS airport_name,
      EXISTS(SELECT 1 FROM tax_rules tr WHERE tr.country_id = ref.country_id
        AND (tr.airport_id <=> ref.airport_id OR (ref.airport_id IS NOT NULL AND tr.airport_id IS NULL))
        AND tr.code = COALESCE(ref.rule_code, ref.code) AND tr.active = 1
        AND tr.valid_from <= NOW() AND (tr.valid_to IS NULL OR tr.valid_to > NOW())) AS has_active_rule
    FROM tax_references ref JOIN countries c ON c.id = ref.country_id
    LEFT JOIN airports a ON a.id = ref.airport_id
    WHERE c.active = 1
    ORDER BY c.name, ref.airport_id IS NULL DESC, a.iata_code, ref.code`);
  res.json({ exito: true, datos: rows });
};
const crearRegla = async (req, res) => {
  const { country_id, airport_id, code, name, calculation_type, value, applies_to, source_url, notes } = req.body;
  if (!country_id || !code || !name || !['percentage', 'fixed'].includes(calculation_type) || !Number.isFinite(Number(value)) || Number(value) < 0) return res.status(400).json({ error: 'Complete país, código, nombre, tipo y valor válido' });
  if (source_url && !/^https?:\/\//i.test(source_url)) return res.status(400).json({ error: 'La fuente debe ser una URL http o https válida' });
  if (applies_to && !['all', 'domestic', 'international'].includes(applies_to)) return res.status(400).json({ error: 'Aplica a debe ser todos, nacional o internacional' });
  const [country] = await pool.query('SELECT id FROM countries WHERE id = ? AND active = 1', [country_id]);
  if (!country.length) return res.status(404).json({ error: 'País no encontrado o inactivo' });
  if (airport_id) {
    const [airport] = await pool.query('SELECT id FROM airports WHERE id = ? AND country_id = ?', [airport_id, country_id]);
    if (!airport.length) return res.status(400).json({ error: 'El aeropuerto debe pertenecer al país seleccionado' });
  }
  const [r] = await pool.query(`INSERT INTO tax_rules
    (country_id, airport_id, code, name, calculation_type, value, applies_to, source_url, source_checked_at, notes, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, IF(? IS NULL, NULL, CURRENT_DATE), ?, ?, ?)`,
  [country_id, airport_id || null, code.toUpperCase(), name, calculation_type, value, applies_to || 'all', source_url || null, source_url || null, notes || null, req.usuario?.id || null, req.usuario?.id || null]);
  res.status(201).json({ exito: true, datos: { id: r.insertId } });
};
const actualizarRegla = async (req, res) => {
  const { country_id, airport_id, code, name, calculation_type, value, applies_to, source_url, notes } = req.body;
  if (!country_id || !code || !name || !['percentage', 'fixed'].includes(calculation_type) || !Number.isFinite(Number(value)) || Number(value) < 0) return res.status(400).json({ error: 'Complete país, código, nombre, tipo y valor válido' });
  if (source_url && !/^https?:\/\//i.test(source_url)) return res.status(400).json({ error: 'La fuente debe ser una URL http o https válida' });
  if (applies_to && !['all', 'domestic', 'international'].includes(applies_to)) return res.status(400).json({ error: 'Aplica a debe ser todos, nacional o internacional' });
  const [country] = await pool.query('SELECT id FROM countries WHERE id = ? AND active = 1', [country_id]);
  if (!country.length) return res.status(404).json({ error: 'País no encontrado o inactivo' });
  if (airport_id) {
    const [airport] = await pool.query('SELECT id FROM airports WHERE id = ? AND country_id = ?', [airport_id, country_id]);
    if (!airport.length) return res.status(400).json({ error: 'El aeropuerto debe pertenecer al país seleccionado' });
  }
  const [result] = await pool.query(`UPDATE tax_rules SET country_id = ?, airport_id = ?, code = ?, name = ?,
    calculation_type = ?, value = ?, applies_to = ?, source_url = ?,
    source_checked_at = IF(? IS NULL, NULL, CURRENT_DATE), notes = ?, updated_by = ?
    WHERE id = ?`,
  [country_id, airport_id || null, code.toUpperCase(), name, calculation_type, value, applies_to || 'all', source_url || null,
    source_url || null, notes || null, req.usuario?.id || null, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Regla fiscal no encontrada' });
  res.json({ exito: true });
};
const cambiarRegla = async (req, res) => {
  const { active } = req.body;
  if (active === undefined) return res.status(400).json({ error: 'Debe indicar active' });
  await pool.query('UPDATE tax_rules SET active = ?, updated_by = ? WHERE id = ?', [active ? 1 : 0, req.usuario?.id || null, req.params.id]);
  res.json({ exito: true });
};
// Express 4 no propaga automáticamente promesas rechazadas.
const seguro = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
module.exports = Object.fromEntries(Object.entries({ listarPaises, crearPais, listarReglas, listarReferencias, crearRegla, actualizarRegla, cambiarRegla }).map(([name, handler]) => [name, seguro(handler)]));
