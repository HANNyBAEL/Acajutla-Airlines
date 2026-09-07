const pool = require('../config/db');

const Reserva = {
  crear: async (data) => {
    const { customer_id, user_id, estimated_total, currency = 'USD', time_limit_minutes = 30 } = data;
    const timeLimit = new Date();
    timeLimit.setMinutes(timeLimit.getMinutes() + time_limit_minutes);

    const [result] = await pool.query(
      `INSERT INTO reservations (pnr, customer_id, user_id, status, estimated_total, currency, created_at, time_limit)
       VALUES (?, ?, ?, 'pending', ?, ?, NOW(), ?)`,
      [data.pnr, customer_id, user_id, estimated_total, currency, timeLimit]
    );
    return { id: result.insertId, pnr: data.pnr, time_limit: timeLimit };
  },

  buscarPorPNR: async (pnr) => {
    const [rows] = await pool.query(
      `SELECT r.*, c.first_names AS customer_first_names, c.last_names AS customer_last_names, c.email AS customer_email
       FROM reservations r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.pnr = ?`,
      [pnr.toUpperCase()]
    );
    return rows[0];
  },

  obtenerDetalleCompleto: async (pnr) => {
    const [reserva] = await pool.query(
      `SELECT r.*, c.first_names AS customer_first_names, c.last_names AS customer_last_names, c.email AS customer_email, c.phone AS customer_phone
       FROM reservations r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.pnr = ?`,
      [pnr.toUpperCase()]
    );
    if (!reserva[0]) return null;

    const [pasajeros] = await pool.query(
      `SELECT p.*, fs.flight_id, fs.fare_class, fs.seat,
              f.flight_number, f.departure_datetime, f.arrival_datetime,
              ao.iata_code AS origin, ad.iata_code AS destination
       FROM passengers p
       JOIN flight_segments fs ON fs.reservation_id = p.reservation_id
       JOIN flights f ON f.id = fs.flight_id
       JOIN routes rt ON f.route_id = rt.id
       JOIN airports ao ON rt.origin_id = ao.id
       JOIN airports ad ON rt.destination_id = ad.id
       WHERE p.reservation_id = ? ORDER BY p.id ASC`,
      [reserva[0].id]
    );

    const [pagos] = await pool.query(`SELECT * FROM payments WHERE reservation_id = ? ORDER BY payment_date DESC`, [reserva[0].id]);
    return { ...reserva[0], passengers: pasajeros, payments: pagos };
  },

  actualizarEstado: async (id, status, datosExtra = {}) => {
    const campos = ['status = ?'];
    const valores = [status];
    if (datosExtra.total_paid !== undefined) { campos.push('paid_total = ?'); valores.push(datosExtra.total_paid); }
    if (datosExtra.payment_date) { campos.push('payment_date = ?'); valores.push(datosExtra.payment_date); }
    valores.push(id);
    await pool.query(`UPDATE reservations SET ${campos.join(', ')} WHERE id = ?`, valores);
  },

  listar: async (filtros = {}) => {
    let sql = `SELECT r.*, c.first_names AS customer_first_names, c.last_names AS customer_last_names,
                      (SELECT COUNT(*) FROM passengers p WHERE p.reservation_id = r.id) AS total_passengers
               FROM reservations r LEFT JOIN customers c ON r.customer_id = c.id WHERE 1=1`;
    const valores = [];
    if (filtros.status) { sql += ' AND r.status = ?'; valores.push(filtros.status); }
    sql += ' ORDER BY r.created_at DESC LIMIT 100';
    const [rows] = await pool.query(sql, valores);
    return rows;
  },

  buscarExpiradas: async () => {
    const [rows] = await pool.query(`SELECT id, pnr FROM reservations WHERE status = 'pending' AND time_limit < NOW()`);
    return rows;
  },

  cancelar: async (id, motivo, user_id) => {
    await pool.query(`UPDATE reservations SET status = 'cancelled', cancellation_date = NOW(), cancellation_reason = ?, cancelled_by = ? WHERE id = ?`, [motivo, user_id, id]);
  }
};

module.exports = Reserva;