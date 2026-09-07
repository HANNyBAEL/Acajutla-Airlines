const pool = require('../config/db');

const listarAeropuertos = async (req, res) => {
  try {
    let sql = 'SELECT id, iata_code AS code, icao_code, name, city, country, country_code, active FROM airports';
    if (req.query.activos === '1') sql += ' WHERE active = 1';
    sql += ' ORDER BY iata_code';
    const [rows] = await pool.query(sql);
    res.json({ exito: true, datos: rows });
  } catch (error) {
    console.error('Error listar aeropuertos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const crearAeropuerto = async (req, res) => {
  try {
    const { code, icao_code, name, city, country, country_code } = req.body;
    if (!code || !name || !city || !country) {
      return res.status(400).json({ error: 'code, name, city y country son obligatorios' });
    }
    if (!/^[A-Z]{3}$/i.test(code)) {
      return res.status(400).json({ error: 'El código IATA debe tener 3 letras' });
    }
    const [result] = await pool.query(
      'INSERT INTO airports (iata_code, icao_code, name, city, country, country_code, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [code.toUpperCase(), icao_code || null, name, city, country, country_code || 'SV']
    );
    res.status(201).json({ exito: true, datos: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un aeropuerto con ese código IATA' });
    console.error('Error crear aeropuerto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { active } = req.body;
    if (active === undefined || active === null) {
      return res.status(400).json({ error: 'Debe indicar el estado (active: true o false)' });
    }
    const [existe] = await pool.query('SELECT id, iata_code, active FROM airports WHERE id = ?', [id]);
    if (existe.length === 0) return res.status(404).json({ error: 'Aeropuerto no encontrado' });

    const nuevo = active ? 1 : 0;
    let advertencia = null;

    if (nuevo === 0) {
      const [vuelos] = await pool.query(
        `SELECT COUNT(*) AS total FROM flights f JOIN routes r ON f.route_id = r.id
         WHERE f.status IN ('scheduled','confirmed') AND f.departure_datetime > NOW()
           AND (r.origin_id = ? OR r.destination_id = ?)`,
        [id, id]
      );
      if (vuelos[0].total > 0) {
        advertencia = 'Ojo: este aeropuerto tiene ' + vuelos[0].total + ' vuelo(s) futuro(s) programado(s). Esos vuelos dejarán de aparecer en el buscador.';
      }
    }

    await pool.query('UPDATE airports SET active = ? WHERE id = ?', [nuevo, id]);
    res.json({ exito: true, datos: { id: id, code: existe[0].iata_code, active: nuevo }, advertencia: advertencia });
  } catch (error) {
    console.error('Error cambiar estado aeropuerto:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listarAeropuertos: listarAeropuertos, crearAeropuerto: crearAeropuerto, cambiarEstado: cambiarEstado };