const pool = require('../config/db');

// Estados de reserva que mantienen asientos ocupados. Las canceladas y
// expiradas liberan sus segmentos, pero el filtro protege contra residuos.
const ESTADOS_ACTIVOS = "('pending','confirmed','paid')";

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

  // El FOR UPDATE sobre la fila del vuelo serializa las reservas concurrentes
  // sobre el mismo vuelo: evita que dos transacciones lean la misma
  // disponibilidad y sobrevendan.
  validarDisponibilidad: async (flight_id, fare_class, connection = pool) => {
    const [rows] = await connection.query(
      `SELECT f.flight_number, f.status, f.departure_datetime, f.base_price, at.total_capacity,
              (SELECT COUNT(*) FROM flight_segments fs JOIN reservations rx ON rx.id = fs.reservation_id
                WHERE fs.flight_id = f.id AND rx.status IN ${ESTADOS_ACTIVOS}) AS occupied_seats
       FROM flights f JOIN aircraft ac ON f.aircraft_id = ac.id JOIN aircraft_types at ON at.id = ac.type_id
       WHERE f.id = ? FOR UPDATE`,
      [flight_id]
    );
    if (!rows[0]) throw new Error('Vuelo no encontrado');
    const { flight_number, status, departure_datetime, total_capacity, occupied_seats } = rows[0];
    const available_seats = total_capacity - occupied_seats;
    const vigente = new Date(departure_datetime) > new Date() && ['scheduled', 'confirmed'].includes(status);
    return { disponible: vigente && available_seats > 0, available_seats, flight_number };
  },

  validarAsiento: async (flight_id, seat, connection = pool) => {
    const [rows] = await connection.query(
      `SELECT id FROM flight_segments fs JOIN reservations rx ON rx.id = fs.reservation_id
       WHERE fs.flight_id = ? AND fs.seat = ? AND rx.status IN ${ESTADOS_ACTIVOS} LIMIT 1`,
      [flight_id, seat]
    );
    return rows.length > 0;
  },

  liberarPorReserva: async (reservation_id, connection = pool) => {
    await connection.query('DELETE FROM flight_segments WHERE reservation_id = ?', [reservation_id]);
  },

  listarAsientosOcupados: async (flight_id) => {
    const [rows] = await pool.query(
      `SELECT fs.seat, fs.fare_class, p.first_names, p.last_names
       FROM flight_segments fs JOIN passengers p ON p.id = fs.passenger_id
       JOIN reservations r ON r.id = fs.reservation_id
       WHERE fs.flight_id = ? AND r.status IN ${ESTADOS_ACTIVOS} ORDER BY fs.seat`,
      [flight_id]
    );
    return rows;
  }
};

module.exports = FlightSegment;
