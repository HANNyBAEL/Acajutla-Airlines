const pool = require('../config/db');
const Vuelo = require('../models/Vuelo');

const buscarVuelos = async (req, res) => {
  try {
    const { origen, destino, fecha, clase } = req.query;
    if (!origen || !destino || !fecha) return res.status(400).json({ error: 'origen, destino y fecha son obligatorios' });
    const vuelos = await Vuelo.buscarDisponibles(origen.toUpperCase(), destino.toUpperCase(), fecha, clase);
    res.json({ exito: true, total: vuelos.length, datos: vuelos });
  } catch (error) {
    console.error('Error al buscar vuelos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const listarVuelos = async (req, res) => {
  try {
    const vuelos = await Vuelo.listarTodos();
    res.json({ exito: true, datos: vuelos });
  } catch (error) {
    console.error('Error al listar vuelos:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const obtenerVuelo = async (req, res) => {
  try {
    const vuelo = await Vuelo.buscarPorId(req.params.id);
    if (!vuelo) return res.status(404).json({ error: 'Vuelo no encontrado' });
    res.json({ exito: true, datos: vuelo });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const listarAeronaves = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.registration, t.model, t.total_capacity
       FROM aircraft a JOIN aircraft_types t ON a.type_id = t.id
       WHERE a.status IN ('available','in_flight')
       ORDER BY a.registration`
    );
    res.json({ exito: true, datos: rows });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const crearVuelo = async (req, res) => {
  try {
    const { origen_iata, destino_iata, aircraft_id, flight_number, departure_datetime, arrival_datetime, base_price, gate } = req.body;
    if (!origen_iata || !destino_iata || !aircraft_id || !flight_number || !departure_datetime || !arrival_datetime || !base_price) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    if (origen_iata === destino_iata) return res.status(400).json({ error: 'El origen y el destino deben ser diferentes' });
    if (new Date(arrival_datetime) <= new Date(departure_datetime)) return res.status(400).json({ error: 'La llegada debe ser posterior a la salida' });

    const [origen] = await pool.query('SELECT id FROM airports WHERE iata_code = ? AND active = 1', [origen_iata.toUpperCase()]);
    const [destino] = await pool.query('SELECT id FROM airports WHERE iata_code = ? AND active = 1', [destino_iata.toUpperCase()]);
    if (origen.length === 0 || destino.length === 0) return res.status(400).json({ error: 'Aeropuerto inválido o inactivo' });

    const [rutas] = await pool.query('SELECT id FROM routes WHERE origin_id = ? AND destination_id = ?', [origen[0].id, destino[0].id]);
    let routeId;
    if (rutas.length > 0) {
      routeId = rutas[0].id;
    } else {
      const [nr] = await pool.query('INSERT INTO routes (origin_id, destination_id, route_code, active) VALUES (?, ?, ?, 1)', [origen[0].id, destino[0].id, origen_iata.toUpperCase() + '-' + destino_iata.toUpperCase()]);
      routeId = nr.insertId;
    }

    const [result] = await pool.query(
      'INSERT INTO flights (route_id, aircraft_id, flight_number, departure_datetime, arrival_datetime, status, base_price, gate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [routeId, aircraft_id, flight_number.toUpperCase(), departure_datetime, arrival_datetime, 'scheduled', base_price, gate || null]
    );
    res.status(201).json({ exito: true, datos: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe ese número de vuelo en esa fecha y hora' });
    console.error('Error crear vuelo:', error);
    res.status(500).json({ error: 'Error interno' });
  }
};

const cancelarVuelo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const body = req.body || {};
    const motivo = body.motivo || 'Cancelado por operaciones';
    const confirmar = body.confirmar === true;

    const [vuelos] = await pool.query('SELECT id, flight_number, status FROM flights WHERE id = ?', [id]);
    if (vuelos.length === 0) return res.status(404).json({ error: 'Vuelo no encontrado' });
    const vuelo = vuelos[0];

    if (vuelo.status === 'cancelled') return res.status(400).json({ error: 'El vuelo ya está cancelado' });
    if (vuelo.status === 'in_progress' || vuelo.status === 'completed') {
      return res.status(400).json({ error: 'No se puede cancelar un vuelo en curso o finalizado' });
    }

    const [afectados] = await pool.query(
      `SELECT COUNT(DISTINCT r.id) AS total
       FROM flight_segments fs
       JOIN reservations r ON r.id = fs.reservation_id
       WHERE fs.flight_id = ? AND r.status IN ('pending','confirmed','paid')`,
      [id]
    );
    const total = afectados[0].total;

    if (total > 0 && !confirmar) {
      return res.status(409).json({ error: 'El vuelo tiene reservas activas asociadas', afectados: total, requiereConfirmacion: true });
    }

    await pool.query('UPDATE flights SET status = ? WHERE id = ?', ['cancelled', id]);
    res.json({ exito: true, mensaje: 'Vuelo ' + vuelo.flight_number + ' cancelado', datos: { id: id, reservasAfectadas: total, motivo: motivo } });
  } catch (error) {
    console.error('Error cancelar vuelo:', error);
    res.status(500).json({ error: 'Error interno al cancelar' });
  }
};

const reprogramarVuelo = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { departure_datetime, arrival_datetime, aircraft_id, gate } = req.body || {};

    const [vuelos] = await pool.query('SELECT id, flight_number, status, departure_datetime FROM flights WHERE id = ?', [id]);
    if (vuelos.length === 0) return res.status(404).json({ error: 'Vuelo no encontrado' });
    const vuelo = vuelos[0];

    if (vuelo.status === 'in_progress' || vuelo.status === 'completed') {
      return res.status(400).json({ error: 'No se puede reprogramar un vuelo en curso o finalizado' });
    }
    if (!departure_datetime || !arrival_datetime) {
      return res.status(400).json({ error: 'Indique la nueva fecha de salida y de llegada' });
    }
    if (new Date(arrival_datetime) <= new Date(departure_datetime)) {
      return res.status(400).json({ error: 'La llegada debe ser posterior a la salida' });
    }

    const nuevoStatus = vuelo.status === 'cancelled' ? 'scheduled' : vuelo.status;
    const campos = ['departure_datetime = ?', 'arrival_datetime = ?', 'status = ?'];
    const vals = [departure_datetime, arrival_datetime, nuevoStatus];
    if (aircraft_id) { campos.push('aircraft_id = ?'); vals.push(aircraft_id); }
    if (gate) { campos.push('gate = ?'); vals.push(gate); }
    vals.push(id);
    await pool.query('UPDATE flights SET ' + campos.join(', ') + ' WHERE id = ?', vals);

    try {
      await pool.query(
        'UPDATE flights SET observations = ? WHERE id = ?',
        ['Reprogramado el ' + new Date().toLocaleString('es-SV') + '. Salida original: ' + new Date(vuelo.departure_datetime).toLocaleString('es-SV') + '. Estado previo: ' + vuelo.status, id]
      );
    } catch (e) { /* columna observations opcional */ }

    res.json({ exito: true, mensaje: 'Vuelo ' + vuelo.flight_number + ' reprogramado', datos: { id: id, flight_number: vuelo.flight_number, nuevo_estado: nuevoStatus } });
  } catch (error) {
    console.error('Error reprogramar vuelo:', error);
    res.status(500).json({ error: 'Error interno al reprogramar' });
  }
};

module.exports = { buscarVuelos: buscarVuelos, listarVuelos: listarVuelos, obtenerVuelo: obtenerVuelo, listarAeronaves: listarAeronaves, crearVuelo: crearVuelo, cancelarVuelo: cancelarVuelo, reprogramarVuelo: reprogramarVuelo };