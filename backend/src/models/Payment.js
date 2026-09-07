const pool = require('../config/db');

const Payment = {
  buscarPorId: async (id) => {
    const [rows] = await pool.query(
      `SELECT p.*, r.pnr, r.status AS reservation_status, e.username AS processed_by_username
       FROM payments p JOIN reservations r ON p.reservation_id = r.id
       LEFT JOIN users e ON p.processed_by = e.id WHERE p.id = ?`,
      [id]
    );
    return rows[0];
  },

  buscarPorReferencia: async (referencia) => {
    const [rows] = await pool.query('SELECT * FROM payments WHERE external_reference = ?', [referencia]);
    return rows[0];
  },

  listar: async (filtros = {}) => {
    let sql = `SELECT p.*, r.pnr, r.status AS reservation_status, e.username AS processed_by_username
               FROM payments p JOIN reservations r ON p.reservation_id = r.id
               LEFT JOIN users e ON p.processed_by = e.id WHERE 1=1`;
    const valores = [];
    if (filtros.status) { sql += ' AND p.status = ?'; valores.push(filtros.status); }
    if (filtros.method) { sql += ' AND p.method = ?'; valores.push(filtros.method); }
    if (filtros.type) { sql += ' AND p.type = ?'; valores.push(filtros.type); }
    if (filtros.pnr) { sql += ' AND r.pnr = ?'; valores.push(filtros.pnr.toUpperCase()); }
    sql += ' ORDER BY p.payment_date DESC LIMIT 200';
    const [rows] = await pool.query(sql, valores);
    return rows;
  },

  obtenerKPIs: async (fecha) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total_transactions,
              SUM(CASE WHEN status = 'approved' AND type != 'refund' THEN amount ELSE 0 END) AS total_income,
              SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) AS total_refunds,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
              SUM(CASE WHEN status = 'pending_confirmation' THEN 1 ELSE 0 END) AS pending
       FROM payments WHERE DATE(payment_date) = ?`,
      [fecha]
    );
    return rows[0];
  },

  listarPendientes: async () => {
    const [rows] = await pool.query(
      `SELECT p.*, r.pnr, r.estimated_total, c.first_names AS customer_first_names, c.email AS customer_email
       FROM payments p JOIN reservations r ON p.reservation_id = r.id
       LEFT JOIN customers c ON r.customer_id = c.id WHERE p.status = 'pending_confirmation' ORDER BY p.payment_date ASC`
    );
    return rows;
  }
};

module.exports = Payment;