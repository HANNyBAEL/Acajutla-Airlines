const pool = require('../config/db');

const getParam = async (key, def) => {
  const [r] = await pool.query('SELECT param_value FROM config_params WHERE param_key = ?', [key]);
  return r.length ? r[0].param_value : def;
};

const listarTripulacion = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM crew_members ORDER BY full_name');
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crearTripulante = async (req, res) => {
  try {
    const { full_name, role_operativo, license_type, license_number, license_expiry, qualifications } = req.body;
    if (!full_name || !role_operativo) return res.status(400).json({ error: 'Nombre y rol operativo son obligatorios' });
    const [r] = await pool.query(
      'INSERT INTO crew_members (full_name, role_operativo, license_type, license_number, license_expiry, qualifications) VALUES (?,?,?,?,?,?)',
      [full_name, role_operativo, license_type || null, license_number || null, license_expiry || null, qualifications ? JSON.stringify(qualifications) : null]
    );
    res.status(201).json({ exito: true, datos: { id: r.insertId } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const asignarCrew = async (req, res) => {
  try {
    const { flight_id, crew_member_id, role, duty_start, duty_end } = req.body;
    const [cm] = await pool.query('SELECT * FROM crew_members WHERE id = ?', [crew_member_id]);
    if (!cm.length) return res.status(404).json({ error: 'Tripulante no encontrado' });
    const c = cm[0];
    if (['pilot', 'copilot'].includes(c.role_operativo) && c.license_expiry && new Date(c.license_expiry) < new Date(duty_start || Date.now())) {
      return res.status(400).json({ error: 'Licencia vencida para la fecha del deber' });
    }
    if (duty_start && duty_end) {
      const [sol] = await pool.query(
        'SELECT id FROM flight_crew WHERE crew_member_id = ? AND duty_start IS NOT NULL AND duty_end IS NOT NULL AND ? < duty_end AND ? > duty_start',
        [crew_member_id, duty_start, duty_end]
      );
      if (sol.length) return res.status(409).json({ error: 'El tripulante ya tiene un deber solapado en ese horario' });
      const rest = parseFloat(await getParam('crew_rest_hours', '10'));
      const [prev] = await pool.query(
        'SELECT duty_end FROM flight_crew WHERE crew_member_id = ? AND duty_end IS NOT NULL AND duty_end <= ? ORDER BY duty_end DESC LIMIT 1',
        [crew_member_id, duty_start]
      );
      if (prev.length) {
        const gap = (new Date(duty_start) - new Date(prev[0].duty_end)) / 3600000;
        if (gap < rest) return res.status(409).json({ error: 'Descanso insuficiente: ' + gap.toFixed(1) + 'h < ' + rest + 'h requeridas' });
      }
    }
    await pool.query('INSERT INTO flight_crew (flight_id, crew_member_id, role, duty_start, duty_end) VALUES (?,?,?,?,?)',
      [flight_id, crew_member_id, role || c.role_operativo, duty_start || null, duty_end || null]);
    res.status(201).json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crewDeVuelo = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT fc.*, cm.full_name, cm.role_operativo, cm.license_type FROM flight_crew fc JOIN crew_members cm ON cm.id = fc.crew_member_id WHERE fc.flight_id = ? ORDER BY cm.full_name',
      [req.params.flightId]
    );
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const listarClases = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fare_classes ORDER BY code');
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crearClase = async (req, res) => {
  try {
    const { code, name, multiplier, conditions } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'Código y nombre son obligatorios' });
    const [r] = await pool.query('INSERT INTO fare_classes (code, name, multiplier, conditions) VALUES (?,?,?,?)',
      [code.toUpperCase(), name, multiplier || 1.0, conditions || null]);
    res.status(201).json({ exito: true, datos: { id: r.insertId } });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código de clase ya existe' });
    res.status(500).json({ error: 'Error interno' });
  }
};

const asignarFare = async (req, res) => {
  try {
    const { flight_id, fare_class_id, price, seats_allocated } = req.body;
    let precio = price;
    if (precio === undefined || precio === null || precio === '') {
      const [f] = await pool.query('SELECT base_price FROM flights WHERE id = ?', [flight_id]);
      const [cl] = await pool.query('SELECT multiplier FROM fare_classes WHERE id = ?', [fare_class_id]);
      if (!f.length || !cl.length) return res.status(404).json({ error: 'Vuelo o clase no encontrada' });
      precio = Math.round(f[0].base_price * cl[0].multiplier * 100) / 100;
    }
    await pool.query(
      'INSERT INTO flight_fares (flight_id, fare_class_id, price, seats_allocated) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE price = VALUES(price), seats_allocated = VALUES(seats_allocated)',
      [flight_id, fare_class_id, precio, seats_allocated || 0]
    );
    res.status(201).json({ exito: true, datos: { price: precio } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const faresDeVuelo = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT ff.*, fc.code, fc.name FROM flight_fares ff JOIN fare_classes fc ON fc.id = ff.fare_class_id WHERE ff.flight_id = ? ORDER BY fc.code',
      [req.params.flightId]
    );
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const listarFacilities = async (req, res) => {
  try {
    const { airport_id } = req.query;
    const [rows] = await pool.query(
      'SELECT f.*, a.iata_code FROM airport_facilities f JOIN airports a ON a.id = f.airport_id WHERE ? IS NULL OR f.airport_id = ? ORDER BY a.iata_code, f.code',
      [airport_id || null, airport_id || null]
    );
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crearFacility = async (req, res) => {
  try {
    const { airport_id, type, code } = req.body;
    if (!airport_id || !type || !code) return res.status(400).json({ error: 'Aeropuerto, tipo y código son obligatorios' });
    const [r] = await pool.query('INSERT INTO airport_facilities (airport_id, type, code) VALUES (?,?,?)', [airport_id, type, code.toUpperCase()]);
    res.status(201).json({ exito: true, datos: { id: r.insertId } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const getConfig = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM config_params ORDER BY param_key');
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const updateConfig = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: 'key y value son obligatorios' });
    await pool.query('UPDATE config_params SET param_value = ? WHERE param_key = ?', [String(value), key]);
    res.json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const trazabilidad = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuid]);
    const [tr] = await pool.query('SELECT stage, detail, created_at FROM dte_trace WHERE dte_uuid = ? ORDER BY created_at', [uuid]);
    const etapas = [];
    if (h.length) {
      const d = h[0];
      etapas.push({ stage: 'generado', created_at: d.created_at, detail: { numeroControl: d.control_number, tipoDte: d.dte_type } });
      etapas.push({ stage: 'firmado', created_at: d.created_at, detail: { nota: 'Firma electrónica simulada aplicada' } });
      etapas.push({ stage: d.transmission_status === 'contingency' ? 'contingencia' : 'transmitido', created_at: d.created_at, detail: { modelo: d.transmission_status === 'contingency' ? 'Diferido' : 'Previo' } });
      if (d.reception_seal) etapas.push({ stage: 'sellado', created_at: d.created_at, detail: { sello: d.reception_seal } });
      if (d.transmission_status === 'invalidated') etapas.push({ stage: 'invalidado', created_at: d.created_at, detail: {} });
    }
    tr.forEach((t) => etapas.push({ stage: t.stage, created_at: t.created_at, detail: t.detail }));
    res.json({ exito: true, datos: etapas });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

module.exports = {
  listarTripulacion, crearTripulante, asignarCrew, crewDeVuelo,
  listarClases, crearClase, asignarFare, faresDeVuelo,
  listarFacilities, crearFacility, getConfig, updateConfig, trazabilidad
};