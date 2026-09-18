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

const actualizarTripulante = async (req, res) => {
  try {
    const { full_name, role_operativo, license_type, license_number, license_expiry, qualifications, active } = req.body;
    if (!full_name || !role_operativo) return res.status(400).json({ error: 'Nombre y rol operativo son obligatorios' });
    const [existe] = await pool.query('SELECT id FROM crew_members WHERE id = ?', [req.params.id]);
    if (!existe.length) return res.status(404).json({ error: 'Tripulante no encontrado' });
    await pool.query(
      'UPDATE crew_members SET full_name = ?, role_operativo = ?, license_type = ?, license_number = ?, license_expiry = ?, qualifications = ?, active = ? WHERE id = ?',
      [
        full_name, role_operativo, license_type || null, license_number || null, license_expiry || null,
        qualifications ? JSON.stringify(qualifications) : null, active !== undefined ? (active ? 1 : 0) : 1, req.params.id
      ]
    );
    res.json({ exito: true });
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
  let connection;
  try {
    const { flight_id, fare_class_id, price, seats_allocated } = req.body;
    const precio = Number(price);
    if (!flight_id || !fare_class_id || !Number.isFinite(precio) || precio < 0) {
      return res.status(400).json({ error: 'Vuelo, clase y un precio final válido son obligatorios' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [referencias] = await connection.query(
      `SELECT f.id AS flight_id, fc.id AS class_id
       FROM flights f JOIN fare_classes fc ON fc.id = ? AND fc.active = 1 WHERE f.id = ? FOR UPDATE`,
      [fare_class_id, flight_id]
    );
    if (!referencias.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Vuelo o clase activa no encontrada' });
    }
    // Cerrar la versión anterior antes de abrir la nueva preserva historial y
    // garantiza una sola tarifa vigente por vuelo y clase.
    await connection.query(
      'UPDATE flight_fares SET active = 0, valid_to = NOW(), updated_by = ? WHERE flight_id = ? AND fare_class_id = ? AND active = 1',
      [req.usuario?.id || null, flight_id, fare_class_id]
    );
    const [r] = await connection.query(
      `INSERT INTO flight_fares (flight_id, fare_class_id, price, seats_allocated, active, valid_from, created_by, updated_by)
       VALUES (?, ?, ?, ?, 1, NOW(), ?, ?)`,
      [flight_id, fare_class_id, precio, Number(seats_allocated) || 0, req.usuario?.id || null, req.usuario?.id || null]
    );
    await connection.commit();
    res.status(201).json({ exito: true, datos: { id: r.insertId, price: precio, impuestos_incluidos: true } });
  } catch (e) {
    if (connection) await connection.rollback();
    console.error('Error al versionar tarifa:', e);
    res.status(500).json({ error: 'Error interno' });
  } finally { if (connection) connection.release(); }
};

const faresDeVuelo = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ff.*, fc.code, fc.name, u.username AS changed_by
       FROM flight_fares ff JOIN fare_classes fc ON fc.id = ff.fare_class_id
       LEFT JOIN users u ON u.id = ff.updated_by
       WHERE ff.flight_id = ? ORDER BY ff.active DESC, fc.code, ff.valid_from DESC`,
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
  listarTripulacion, crearTripulante, actualizarTripulante, asignarCrew, crewDeVuelo,
  listarClases, crearClase, asignarFare, faresDeVuelo,
  listarFacilities, crearFacility, getConfig, updateConfig, trazabilidad
};
