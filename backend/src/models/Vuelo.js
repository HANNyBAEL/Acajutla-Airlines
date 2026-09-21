const pool = require('../config/db');

const Vuelo = {
  buscarDisponibles: async (origen, destino, fecha, clase = 'economy') => {
    const sql = `
      SELECT f.id, f.flight_number, f.departure_datetime, f.arrival_datetime, f.status, f.base_price,
             ff.id AS fare_id, ff.price AS sale_price, ff.price AS price, fc.code AS fare_class,
             at.model AS aircraft_model, at.total_capacity,
             ao.iata_code AS origin_iata, ao.name AS origin_name,
             ad.iata_code AS destination_iata, ad.name AS destination_name,
             (at.total_capacity - COALESCE(
               (SELECT COUNT(*) FROM flight_segments fs
                JOIN reservations r ON r.id = fs.reservation_id
                WHERE fs.flight_id = f.id AND r.status IN ('pending','confirmed','paid')), 0
             )) AS available_seats
      FROM flights f
      JOIN routes rt ON f.route_id = rt.id
      JOIN airports ao ON rt.origin_id = ao.id
      JOIN airports ad ON rt.destination_id = ad.id
      JOIN aircraft ac ON f.aircraft_id = ac.id
      JOIN aircraft_types at ON ac.type_id = at.id
      JOIN flight_fares ff ON ff.flight_id = f.id AND ff.active = 1
        AND (ff.valid_to IS NULL OR ff.valid_to > NOW())
      JOIN fare_classes fc ON fc.id = ff.fare_class_id AND fc.code = ? AND fc.active = 1
      WHERE ao.iata_code = ? AND ad.iata_code = ?
        AND DATE(f.departure_datetime) = ?
        AND f.status IN ('scheduled', 'confirmed')
        AND ao.active = 1 AND ad.active = 1
      ORDER BY f.departure_datetime ASC
    `;
    const [rows] = await pool.query(sql, [clase, origen, destino, fecha]);
    return rows;
  },

  buscarPorId: async (id) => {
    const [rows] = await pool.query('SELECT * FROM flights WHERE id = ?', [id]);
    return rows[0];
  },

  // El id autoincremental refleja el orden de creación: los últimos vuelos
  // creados aparecen primero, sin importar qué tan lejana sea su fecha de salida.
  listarTodos: async (fecha) => {
    const params = [];
    let filtroFecha = '';
    if (fecha) {
      filtroFecha = 'WHERE DATE(f.departure_datetime) = ?';
      params.push(fecha);
    }
    const [rows] = await pool.query(`
      SELECT f.*, ao.iata_code AS origin, ad.iata_code AS destination, at.model AS aircraft,
             CASE
               WHEN f.departure_datetime <= NOW() AND f.status IN ('scheduled', 'confirmed', 'delayed') THEN 'deployed'
               ELSE f.status
             END AS display_status
      FROM flights f
      JOIN routes rt ON f.route_id = rt.id
      JOIN airports ao ON rt.origin_id = ao.id
      JOIN airports ad ON rt.destination_id = ad.id
      JOIN aircraft ac ON f.aircraft_id = ac.id
      JOIN aircraft_types at ON ac.type_id = at.id
      ${filtroFecha}
      ORDER BY f.id DESC
    `, params);
    return rows;
  }
};

module.exports = Vuelo;
