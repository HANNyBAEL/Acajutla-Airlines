const pool = require('../config/db');

const getParam = async (key, def) => {
  const [r] = await pool.query('SELECT param_value FROM config_params WHERE param_key = ?', [key]);
  return r.length ? r[0].param_value : def;
};

const listarTripulacion = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cm.*,
              (SELECT COUNT(*) FROM flight_crew fc WHERE fc.crew_member_id = cm.id) AS history_count
       FROM crew_members cm ORDER BY cm.full_name`
    );
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

const eliminarTripulante = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
  try {
    const [existe] = await pool.query(
      `SELECT cm.id,
              (SELECT COUNT(*) FROM flight_crew fc WHERE fc.crew_member_id = cm.id) AS history_count
       FROM crew_members cm WHERE cm.id = ?`, [id]
    );
    if (!existe.length) return res.status(404).json({ error: 'Tripulante no encontrado' });
    const historial = Number(existe[0].history_count);
    if (historial > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar: el tripulante tiene historial de asignaciones a vuelos',
        historial: { asignaciones: historial }
      });
    }
    const [resultado] = await pool.query('DELETE FROM crew_members WHERE id = ?', [id]);
    if (!resultado.affectedRows) return res.status(404).json({ error: 'Tripulante no encontrado' });
    res.json({ exito: true, mensaje: 'Tripulante eliminado' });
  } catch (e) {
    console.error('Error eliminar tripulante:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const asignarCrew = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const { flight_id, crew_member_id, role } = req.body;
    const [cm] = await conn.query('SELECT * FROM crew_members WHERE id = ? FOR UPDATE', [crew_member_id]);
    const c = cm[0];
    if (!c || !Number(c.active)) throw new Error('Tripulante inexistente o inactivo');
    if (role && role !== c.role_operativo) throw new Error('El rol asignado debe coincidir con la habilitación del tripulante');
    const [flights] = await conn.query('SELECT departure_datetime, arrival_datetime, status FROM flights WHERE id = ? FOR UPDATE', [flight_id]);
    const f = flights[0];
    if (!f || !['scheduled', 'confirmed'].includes(f.status)) throw new Error('El vuelo no admite asignaciones');
    const duty_start = req.body.duty_start || f.departure_datetime;
    const duty_end = req.body.duty_end || f.arrival_datetime;
    const start = new Date(duty_start), end = new Date(duty_end);
    if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || start > new Date(f.departure_datetime) || end < new Date(f.arrival_datetime)) throw new Error('El deber debe cubrir el horario completo del vuelo');
    if (['pilot', 'copilot'].includes(c.role_operativo) && (!c.license_expiry || String(c.license_expiry).slice(0, 10) < String(duty_end).slice(0, 10))) throw new Error('Licencia ausente o vencida para la fecha del deber');
    const [cfg] = await conn.query("SELECT param_value FROM config_params WHERE param_key = 'crew_rest_hours'");
    const rest = Number(cfg[0]?.param_value ?? 10);
    if (!Number.isFinite(rest) || rest < 0) throw new Error('Configuración de descanso inválida');
    // El bloqueo de tripulante serializa asignaciones. Revisa también el deber posterior.
    const [conflictos] = await conn.query(
      `SELECT fc.id FROM flight_crew fc JOIN flights f ON f.id = fc.flight_id
       WHERE fc.crew_member_id = ? AND f.status <> 'cancelled'
       AND DATE_SUB(COALESCE(fc.duty_start, f.departure_datetime), INTERVAL ? HOUR) < ?
       AND DATE_ADD(COALESCE(fc.duty_end, f.arrival_datetime), INTERVAL ? HOUR) > ?`,
      [crew_member_id, rest, duty_end, rest, duty_start]);
    if (conflictos.length) throw new Error('Horario solapado o descanso insuficiente entre deberes');
    await conn.query('INSERT INTO flight_crew (flight_id, crew_member_id, role, duty_start, duty_end) VALUES (?,?,?,?,?)', [flight_id, crew_member_id, c.role_operativo, duty_start, duty_end]);
    await conn.commit();
    res.status(201).json({ exito: true });
  } catch (e) {
    if (conn) await conn.rollback();
    res.status(409).json({ error: e.message });
  } finally { if (conn) conn.release(); }
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
    const [rows] = await pool.query(
      `SELECT fc.*,
              (SELECT COUNT(*) FROM flight_fares ff WHERE ff.fare_class_id = fc.id) AS history_count
       FROM fare_classes fc ORDER BY fc.code`
    );
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

const eliminarClase = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
  try {
    const [existe] = await pool.query(
      `SELECT fc.id,
              (SELECT COUNT(*) FROM flight_fares ff WHERE ff.fare_class_id = fc.id) AS history_count
       FROM fare_classes fc WHERE fc.id = ?`, [id]
    );
    if (!existe.length) return res.status(404).json({ error: 'Clase tarifaria no encontrada' });
    const historial = Number(existe[0].history_count);
    if (historial > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar: la clase tarifaria conserva historial de tarifas',
        historial: { tarifas: historial }
      });
    }
    const [resultado] = await pool.query('DELETE FROM fare_classes WHERE id = ?', [id]);
    if (!resultado.affectedRows) return res.status(404).json({ error: 'Clase tarifaria no encontrada' });
    res.json({ exito: true, mensaje: 'Clase tarifaria eliminada' });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'No se puede eliminar: existen tarifas relacionadas' });
    console.error('Error eliminar clase tarifaria:', e);
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
      `SELECT af.*, a.iata_code,
              (SELECT COUNT(*) FROM flights fl
               WHERE (af.type = 'gate' AND BINARY LOWER(fl.gate) = BINARY LOWER(af.code))
                  OR (af.type = 'terminal' AND BINARY LOWER(fl.terminal) = BINARY LOWER(af.code))) AS history_count
       FROM airport_facilities af JOIN airports a ON a.id = af.airport_id
       WHERE ? IS NULL OR af.airport_id = ? ORDER BY a.iata_code, af.code`,
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

const actualizarFacility = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
  const { active } = req.body || {};
  if (active === undefined || active === null) return res.status(400).json({ error: 'Debe indicar el estado de la instalación' });
  try {
    const [resultado] = await pool.query('UPDATE airport_facilities SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    if (!resultado.affectedRows) {
      const [existe] = await pool.query('SELECT id FROM airport_facilities WHERE id = ?', [id]);
      if (!existe.length) return res.status(404).json({ error: 'Instalación no encontrada' });
    }
    res.json({ exito: true, datos: { id, active: active ? 1 : 0 } });
  } catch (e) {
    console.error('Error actualizar infraestructura:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const eliminarFacility = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
  try {
    const [existe] = await pool.query(
      `SELECT af.id, af.type, af.code,
              (SELECT COUNT(*) FROM flights fl
               WHERE (af.type = 'gate' AND BINARY LOWER(fl.gate) = BINARY LOWER(af.code))
                  OR (af.type = 'terminal' AND BINARY LOWER(fl.terminal) = BINARY LOWER(af.code))) AS history_count
       FROM airport_facilities af WHERE af.id = ?`, [id]
    );
    if (!existe.length) return res.status(404).json({ error: 'Instalación no encontrada' });
    const historial = Number(existe[0].history_count);
    if (historial > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar: la instalación aparece en el historial de vuelos',
        historial: { vuelos: historial }
      });
    }
    const [resultado] = await pool.query('DELETE FROM airport_facilities WHERE id = ?', [id]);
    if (!resultado.affectedRows) return res.status(404).json({ error: 'Instalación no encontrada' });
    res.json({ exito: true, mensaje: 'Instalación eliminada' });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'No se puede eliminar: existen registros relacionados' });
    console.error('Error eliminar infraestructura:', e);
    res.status(500).json({ error: 'Error interno' });
  }
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
  listarTripulacion, crearTripulante, actualizarTripulante, eliminarTripulante, asignarCrew, crewDeVuelo,
  listarClases, crearClase, eliminarClase, asignarFare, faresDeVuelo,
  listarFacilities, crearFacility, actualizarFacility, eliminarFacility, getConfig, updateConfig, trazabilidad
};
