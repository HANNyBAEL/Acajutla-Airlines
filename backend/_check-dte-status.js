require('dotenv').config();
const pool = require('./src/config/db');
(async () => {
  const [rows] = await pool.query(
    `SELECT transmission_status, COUNT(*) AS n FROM dte_headers GROUP BY transmission_status`
  );
  console.log('by status:', rows);
  const [cont] = await pool.query(
    "SELECT id, control_number, transmission_status, reception_seal FROM dte_headers WHERE transmission_status = 'contingency' ORDER BY id DESC LIMIT 10"
  );
  console.log('contingency rows:', cont);
  const [trans] = await pool.query(
    "SELECT id, control_number, transmission_status, reception_seal FROM dte_headers WHERE transmission_status = 'transmitted' ORDER BY id DESC LIMIT 10"
  );
  console.log('transmitted rows:', trans);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
