const pool = require('../config/db');

const Pasajero = {
  agregar: async (data) => {
    const { reservation_id, passenger_type = 'adult', first_names, last_names, document_type, document_number, birth_date, nationality, email, phone } = data;
    const [result] = await pool.query(
      `INSERT INTO passengers (reservation_id, passenger_type, first_names, last_names, document_type, document_number, birth_date, nationality, email, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reservation_id, passenger_type, first_names, last_names, document_type, document_number, birth_date, nationality, email, phone]
    );
    return { id: result.insertId };
  },

  listarPorReserva: async (reservation_id) => {
    const [rows] = await pool.query(
      `SELECT p.*, fs.fare_class, fs.seat, f.flight_number, f.departure_datetime
       FROM passengers p
       LEFT JOIN flight_segments fs ON fs.reservation_id = p.reservation_id AND fs.passenger_id = p.id
       LEFT JOIN flights f ON f.id = fs.flight_id
       WHERE p.reservation_id = ? ORDER BY p.id ASC`,
      [reservation_id]
    );
    return rows;
  },

  buscarPorDocumento: async (doc_type, doc_number) => {
    const [rows] = await pool.query(
      `SELECT p.*, r.pnr, r.status AS reservation_status, r.created_at
       FROM passengers p JOIN reservations r ON r.id = p.reservation_id
       WHERE p.document_type = ? AND p.document_number = ? ORDER BY r.created_at DESC`,
      [doc_type, doc_number]
    );
    return rows;
  },

  actualizar: async (id, data) => {
    const campos = [];
    const valores = [];
    const camposPermitidos = ['first_names', 'last_names', 'document_type', 'document_number', 'birth_date', 'nationality', 'email', 'phone'];
    for (const campo of camposPermitidos) {
      if (data[campo] !== undefined) { campos.push(`${campo} = ?`); valores.push(data[campo]); }
    }
    if (campos.length === 0) return { actualizado: false };
    valores.push(id);
    await pool.query(`UPDATE passengers SET ${campos.join(', ')} WHERE id = ?`, valores);
    return { actualizado: true };
  }
};

module.exports = Pasajero;