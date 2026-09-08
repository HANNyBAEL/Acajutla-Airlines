const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  const [cols] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'flight_segments'");
  const names = cols.map((c) => c.COLUMN_NAME);
  if (!names.includes('checkin_status')) await pool.query("ALTER TABLE flight_segments ADD COLUMN checkin_status ENUM('pending','checked_in','boarded','no_show') NOT NULL DEFAULT 'pending'");
  if (!names.includes('checkin_at')) await pool.query("ALTER TABLE flight_segments ADD COLUMN checkin_at DATETIME NULL");
  if (!names.includes('boarding_pass_code')) await pool.query("ALTER TABLE flight_segments ADD COLUMN boarding_pass_code VARCHAR(24) NULL");
  console.log('Migracion check-in OK');
  process.exit(0);
})().catch((e) => { console.error('Error migracion:', e.message); process.exit(1); });