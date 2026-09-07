const pool = require('../config/db');

const DTE = {
  buscarPorReserva: async (reservationId) => {
    const [rows] = await pool.query(`SELECT * FROM dte_headers WHERE reservation_id = ? ORDER BY emission_date DESC`, [reservationId]);
    return rows;
  },

  buscarPorNumeroControl: async (numeroControl) => {
    const [rows] = await pool.query('SELECT * FROM dte_headers WHERE control_number = ?', [numeroControl]);
    return rows[0];
  },

  obtenerCompleto: async (uuid) => {
    const [header] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuid]);
    if (!header[0]) return null;
    const [items] = await pool.query('SELECT * FROM dte_items WHERE header_id = ? ORDER BY item_number', [header[0].id]);
    return { ...header[0], items };
  },

  obtenerKPIs: async (fecha) => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN transmission_status = 'accepted' THEN 1 ELSE 0 END) AS accepted,
              SUM(CASE WHEN transmission_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
              SUM(CASE WHEN transmission_status = 'contingency' THEN 1 ELSE 0 END) AS contingency,
              SUM(CASE WHEN transmission_status = 'transmitted' THEN 1 ELSE 0 END) AS pending,
              SUM(total_to_pay) AS total_billed
       FROM dte_headers WHERE DATE(emission_date) = ?`,
      [fecha]
    );
    return rows[0];
  },

  conciliacionFiscal: async (fechaDesde, fechaHasta) => {
    const [rows] = await pool.query(
      `SELECT DATE(emission_date) AS date, COUNT(*) AS dtes_issued, SUM(total_taxable) AS total_taxable,
              SUM(total_exempt) AS total_exempt, SUM(total_to_pay) AS total_billed,
              SUM(CASE WHEN transmission_status = 'accepted' THEN total_to_pay ELSE 0 END) AS total_accepted,
              SUM(CASE WHEN transmission_status = 'rejected' THEN total_to_pay ELSE 0 END) AS total_rejected
       FROM dte_headers WHERE emission_date BETWEEN ? AND ? GROUP BY DATE(emission_date) ORDER BY date DESC`,
      [fechaDesde, fechaHasta]
    );
    return rows;
  }
};

module.exports = DTE;