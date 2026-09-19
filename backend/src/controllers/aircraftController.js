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

const ESTADOS_AERONAVE = ['available', 'in_flight', 'maintenance', 'out_of_service'];

const actualizar = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'id inválido' });
    const [existe] = await pool.query('SELECT id FROM aircraft WHERE id = ?', [id]);
    if (existe.length === 0) return res.status(404).json({ error: 'Aeronave no encontrada' });

    const { registration, serial_number, status, manufacture_year } = req.body || {};
    if (status !== undefined && !ESTADOS_AERONAVE.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido. Valores: ' + ESTADOS_AERONAVE.join(', ') });
    }
    if (manufacture_year !== undefined && manufacture_year !== null && manufacture_year !== '') {
      const anio = parseInt(manufacture_year, 10);
      if (isNaN(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) {
        return res.status(400).json({ error: 'Año de fabricación inválido' });
      }
    }

    const campos = [];
    const vals = [];
    if (registration !== undefined && registration !== '') {
      const [dup] = await pool.query('SELECT id FROM aircraft WHERE registration = ? AND id <> ?', [registration.toUpperCase(), id]);
      if (dup.length) return res.status(409).json({ error: 'Ya existe una aeronave con esa matrícula' });
      campos.push('registration = ?'); vals.push(registration.toUpperCase());
    }
    if (serial_number !== undefined) { campos.push('serial_number = ?'); vals.push(serial_number || null); }
    if (status !== undefined) { campos.push('status = ?'); vals.push(status); }
    if (manufacture_year !== undefined) { campos.push('manufacture_year = ?'); vals.push(manufacture_year === '' || manufacture_year === null ? null : parseInt(manufacture_year, 10)); }

    if (!campos.length) return res.status(400).json({ error: 'No hay campos para actualizar' });
    vals.push(id);
    await pool.query('UPDATE aircraft SET ' + campos.join(', ') + ' WHERE id = ?', vals);
    res.json({ exito: true, mensaje: 'Aeronave actualizada' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una aeronave con esa matrícula' });
    console.error('Error actualizar aeronave:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const actualizarTipo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'id inválido' });
    const [existe] = await pool.query('SELECT id FROM aircraft_types WHERE id = ?', [id]);
    if (existe.length === 0) return res.status(404).json({ error: 'Tipo de aeronave no encontrado' });

    const { model, manufacturer, total_capacity } = req.body || {};
    if (model === undefined && manufacturer === undefined && total_capacity === undefined) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    if (total_capacity !== undefined) {
      const capacidad = parseInt(total_capacity, 10);
      if (isNaN(capacidad) || capacidad <= 0) {
        return res.status(400).json({ error: 'La capacidad debe ser un número mayor a 0' });
      }
    }

    const campos = [];
    const vals = [];
    if (model !== undefined) { campos.push('model = ?'); vals.push(model); }
    if (manufacturer !== undefined) { campos.push('manufacturer = ?'); vals.push(manufacturer); }
    if (total_capacity !== undefined) { campos.push('total_capacity = ?'); vals.push(parseInt(total_capacity, 10)); }
    vals.push(id);
    await pool.query('UPDATE aircraft_types SET ' + campos.join(', ') + ' WHERE id = ?', vals);
    res.json({ exito: true, mensaje: 'Tipo de aeronave actualizado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe ese modelo de aeronave' });
    console.error('Error actualizar tipo:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const eliminarTipo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'id inválido' });
    const [existe] = await pool.query('SELECT id FROM aircraft_types WHERE id = ?', [id]);
    if (existe.length === 0) return res.status(404).json({ error: 'Tipo de aeronave no encontrado' });

    const [asociadas] = await pool.query('SELECT COUNT(*) AS n FROM aircraft WHERE type_id = ?', [id]);
    if (asociadas[0].n > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar: hay ' + asociadas[0].n + ' aeronave(s) de este tipo en la flota. Elimínalas o reasígnalas primero.'
      });
    }
    await pool.query('DELETE FROM aircraft_types WHERE id = ?', [id]);
    res.json({ exito: true, mensaje: 'Tipo de aeronave eliminado' });
  } catch (error) {
    console.error('Error eliminar tipo:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listar: listar, listarTipos: listarTipos, crear: crear, crearTipo: crearTipo, actualizar: actualizar, actualizarTipo: actualizarTipo, eliminarTipo: eliminarTipo };