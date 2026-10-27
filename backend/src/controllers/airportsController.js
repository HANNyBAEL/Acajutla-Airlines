const pool = require('../config/db');

const listarAeropuertos = async (req, res) => {
  try {
    let sql = `SELECT a.id, a.iata_code AS code, a.icao_code, a.name, a.city,
      COALESCE(c.name, a.country) AS country, COALESCE(c.code, a.country_code) AS country_code, a.country_id, a.active,
      (SELECT COUNT(*) FROM routes r WHERE r.origin_id = a.id OR r.destination_id = a.id) AS route_count
      FROM airports a LEFT JOIN countries c ON c.id = a.country_id`;
    if (req.query.activos === '1') sql += ' WHERE a.active = 1';
    sql += ' ORDER BY a.iata_code';
    const [rows] = await pool.query(sql);
    res.json({ exito: true, datos: rows });
  } catch (error) {
    console.error('Error listar aeropuertos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const crearAeropuerto = async (req, res) => {
  let connection;
  try {
    const { code, icao_code, name, city, country_id, gate_code } = req.body || {};
    if (!code || !name || !city || !country_id) {
      return res.status(400).json({ error: 'code, name, city y country_id son obligatorios' });
    }
    if (!/^[A-Z]{3}$/i.test(code)) {
      return res.status(400).json({ error: 'El código IATA debe tener 3 letras' });
    }
    const gateCode = typeof gate_code === 'string' ? gate_code.trim().toUpperCase() : '';
    if (!/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(gateCode)) {
      return res.status(400).json({ error: 'Indica un código válido para la primera puerta (máximo 20 letras, números o guiones)' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [countries] = await connection.query('SELECT code, name FROM countries WHERE id = ? AND active = 1', [country_id]);
    if (!countries.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'Seleccione un país activo válido' });
    }
    const [result] = await connection.query(
      'INSERT INTO airports (iata_code, icao_code, name, city, country, country_code, country_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [code.toUpperCase(), icao_code || null, name, city, countries[0].name, countries[0].code, country_id]
    );
    await connection.query(
      "INSERT INTO airport_facilities (airport_id, type, code, active) VALUES (?, 'gate', ?, 1)",
      [result.insertId, gateCode]
    );
    await connection.commit();
    res.status(201).json({ exito: true, datos: { id: result.insertId, gate_code: gateCode } });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un aeropuerto con ese código IATA' });
    console.error('Error crear aeropuerto:', error);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    if (connection) connection.release();
  }
};

const actualizarAeropuerto = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'id inválido' });
    const [existe] = await pool.query('SELECT id FROM airports WHERE id = ?', [id]);
    if (existe.length === 0) return res.status(404).json({ error: 'Aeropuerto no encontrado' });

    const { code, icao_code, name, city, country_id } = req.body || {};
    if (!code || !name || !city || !country_id) {
      return res.status(400).json({ error: 'code, name, city y country_id son obligatorios' });
    }
    if (!/^[A-Z]{3}$/i.test(code)) {
      return res.status(400).json({ error: 'El código IATA debe tener 3 letras' });
    }
    const [countries] = await pool.query('SELECT code, name FROM countries WHERE id = ? AND active = 1', [country_id]);
    if (!countries.length) return res.status(400).json({ error: 'Seleccione un país activo válido' });

    try {
      await pool.query(
        'UPDATE airports SET iata_code = ?, icao_code = ?, name = ?, city = ?, country = ?, country_code = ?, country_id = ? WHERE id = ?',
        [code.toUpperCase(), icao_code || null, name, city, countries[0].name, countries[0].code, country_id, id]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un aeropuerto con ese código IATA' });
      throw error;
    }
    res.json({ exito: true, mensaje: 'Aeropuerto actualizado' });
  } catch (error) {
    console.error('Error actualizar aeropuerto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const cambiarEstado = async (req, res) => {
  let connection;
  try {
    const id = parseInt(req.params.id, 10);
    const { active } = req.body;
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    if (active === undefined || active === null) {
      return res.status(400).json({ error: 'Debe indicar el estado (active: true o false)' });
    }
    const nuevo = active ? 1 : 0;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existe] = await connection.query('SELECT id, iata_code, active FROM airports WHERE id = ? FOR UPDATE', [id]);
    if (existe.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Aeropuerto no encontrado' });
    }
    if (nuevo === 1) {
      const [puertas] = await connection.query(
        "SELECT COUNT(*) AS total FROM airport_facilities WHERE airport_id = ? AND type = 'gate' AND active = 1",
        [id]
      );
      if (Number(puertas[0].total) === 0) {
        await connection.rollback();
        return res.status(409).json({ error: `No se puede activar ${existe[0].iata_code}: primero registra y activa al menos una puerta de embarque en Operaciones → Infraestructura.` });
      }
    }
    let advertencia = null;

    if (nuevo === 0) {
      const [vuelos] = await connection.query(
        `SELECT COUNT(*) AS total FROM flights f JOIN routes r ON f.route_id = r.id
         WHERE f.status IN ('scheduled','confirmed')
           AND f.departure_datetime > CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'America/El_Salvador')
           AND (r.origin_id = ? OR r.destination_id = ?)`,
        [id, id]
      );
      if (vuelos[0].total > 0) {
        advertencia = 'Ojo: este aeropuerto tiene ' + vuelos[0].total + ' vuelo(s) futuro(s) programado(s). Esos vuelos dejarán de aparecer en el buscador.';
      }
    }

    await connection.query('UPDATE airports SET active = ? WHERE id = ?', [nuevo, id]);
    await connection.commit();
    res.json({ exito: true, datos: { id: id, code: existe[0].iata_code, active: nuevo }, advertencia: advertencia });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error cambiar estado aeropuerto:', error);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    if (connection) connection.release();
  }
};

const eliminarAeropuerto = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
  try {
    const [rutas] = await pool.query('SELECT COUNT(*) AS total FROM routes WHERE origin_id = ? OR destination_id = ?', [id, id]);
    if (Number(rutas[0].total) > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: el aeropuerto está relacionado con rutas', historial: { rutas: Number(rutas[0].total) } });
    }
    const [result] = await pool.query('DELETE FROM airports WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Aeropuerto no encontrado' });
    res.json({ exito: true, mensaje: 'Aeropuerto eliminado' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'No se puede eliminar: existen registros relacionados' });
    console.error('Error eliminar aeropuerto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listarAeropuertos: listarAeropuertos, crearAeropuerto: crearAeropuerto, actualizarAeropuerto: actualizarAeropuerto, cambiarEstado: cambiarEstado, eliminarAeropuerto: eliminarAeropuerto };
