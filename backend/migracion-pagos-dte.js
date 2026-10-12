const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  const [cols] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'tipo_dte'");
  if (!cols.length) {
    await pool.query("ALTER TABLE payments ADD COLUMN tipo_dte CHAR(2) NULL");
    console.log('Columna payments.tipo_dte agregada');
  } else {
    console.log('Columna payments.tipo_dte ya existe');
  }
  const [deduccion] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'requiere_deduccion_fiscal'");
  if (!deduccion.length) {
    await pool.query('ALTER TABLE payments ADD COLUMN requiere_deduccion_fiscal TINYINT(1) NOT NULL DEFAULT 0');
    console.log('Columna payments.requiere_deduccion_fiscal agregada');
  } else {
    console.log('Columna payments.requiere_deduccion_fiscal ya existe');
  }
  const [receptor] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'receptor_dte'");
  if (!receptor.length) {
    await pool.query('ALTER TABLE payments ADD COLUMN receptor_dte JSON NULL');
    console.log('Columna payments.receptor_dte agregada');
  } else {
    console.log('Columna payments.receptor_dte ya existe');
  }
  process.exit(0);
})().catch((e) => { console.error('Error migracion:', e.message); process.exit(1); });
