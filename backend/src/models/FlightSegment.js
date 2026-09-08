const pool = require('../config/db');

const FlightSegment = {
  asignar: async (data, connection = pool) => {
    const { reservation_id, passenger_id, flight_id, fare_class = 'economy', seat } = data;
    // La reserva y el pasajero pueden estar aún sin confirmar dentro de una
    // transacción. Usar esa misma conexión evita que la FK no los encuentre.
    const disponible = await FlightSegment.validarDisponibilidad(flight_id, fare_class, connection);
    if (!disponible.disponible) {
      throw new Error(`No hay asientos disponibles en el vuelo ${disponible.flight_number}. Disponibles: ${disponible.available_seats}`);
    }
    if (seat) {
      const ocupado = await FlightSegment.validarAsiento(flight_id, seat, connection);
      if (ocupado) throw new Error(`El asiento ${seat} ya está ocupado en este vuelo`);
    }
    const [result] = await connection.query(
      `INSERT INTO flight_segments (reservation_id, passenger_id, flight_id, fare_class, seat) VALUES (?, ?, ?, ?, ?)`,
      [reservation_id, passenger_id, flight_id, fare_class, seat]
    );
    return { id: result.insertId };
  },

  validarDisponibilidad: async (flight_id, fare_class, connection = pool) => {
    // Contar solo segmentos de reservas activas (confirmed o paid), excluyendo expiradas/canceladas
    const [rows] = await connection.query(
      `SELECT f.flight_number, at.total_capacity,
              (SELECT COUNT(*) 
               FROM flight_segments fs 
               INNER JOIN reservations r ON r.id = fs.reservation_id 
               WHERE fs.flight_id = f.id AND r.status IN ('confirmed', 'paid')) AS occupied_seats
       FROM flights f 
       JOIN aircraft ac ON f.aircraft_id = ac.id 
       JOIN aircraft_types at ON ac.type_id = at.id 
       WHERE f.id = ?`,
      [flight_id]
    );
    if (!rows[0]) throw new Error('Vuelo no encontrado');
    const { flight_number, total_capacity, occupied_seats } = rows[0];
    const available_seats = total_capacity - occupied_seats;
    return { disponible: available_seats > 0, available_seats, flight_number };
  },

  validarAsiento: async (flight_id, seat, connection = pool) => {
    const [rows] = await connection.query(`SELECT id FROM flight_segments WHERE flight_id = ? AND seat = ? LIMIT 1`, [flight_id, seat]);
    return rows.length > 0;
  },

  liberarPorReserva: async (reservation_id) => {
    await pool.query('DELETE FROM flight_segments WHERE reservation_id = ?', [reservation_id]);
  },

  listarAsientosOcupados: async (flight_id) => {
    const [rows] = await pool.query(
      `SELECT fs.seat, fs.fare_class, p.first_names, p.last_names
       FROM flight_segments fs JOIN passengers p ON p.id = fs.passenger_id
       JOIN reservations r ON r.id = fs.reservation_id
       WHERE fs.flight_id = ? AND r.status IN ('confirmed','paid') ORDER BY fs.seat`,
      [flight_id]
    );
    return rows;
  }
};

module.exports = FlightSegment;
