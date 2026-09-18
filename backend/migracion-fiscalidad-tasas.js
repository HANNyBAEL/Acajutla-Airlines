const mysql = require('mysql2/promise');
require('dotenv').config();

const columnExists = async (db, table, column) => {
  const [rows] = await db.query(`SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]);
  return rows.length > 0;
};

(async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS countries (
      id INT AUTO_INCREMENT PRIMARY KEY, code CHAR(2) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query(`INSERT INTO countries (code, name)
      SELECT DISTINCT UPPER(COALESCE(NULLIF(country_code, ''), 'SV')), MAX(country)
      FROM airports WHERE country IS NOT NULL AND country <> '' GROUP BY UPPER(COALESCE(NULLIF(country_code, ''), 'SV'))
      ON DUPLICATE KEY UPDATE name = VALUES(name)`);
    if (!(await columnExists(db, 'airports', 'country_id'))) {
      await db.query('ALTER TABLE airports ADD COLUMN country_id INT NULL');
      await db.query('CREATE INDEX airports_country_id ON airports (country_id)');
    }
    await db.query(`UPDATE airports a JOIN countries c ON CAST(c.code AS BINARY) = CAST(UPPER(COALESCE(NULLIF(a.country_code, ''), 'SV')) AS BINARY)
      SET a.country_id = c.id WHERE a.country_id IS NULL`);

    await db.query(`CREATE TABLE IF NOT EXISTS tax_rules (
      id INT AUTO_INCREMENT PRIMARY KEY, country_id INT NOT NULL, airport_id INT NULL,
      code VARCHAR(30) NOT NULL, name VARCHAR(120) NOT NULL,
      calculation_type ENUM('percentage','fixed') NOT NULL,
      value DECIMAL(12,4) NOT NULL, applies_to ENUM('all','domestic','international') NOT NULL DEFAULT 'all',
      active TINYINT(1) NOT NULL DEFAULT 1, valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      valid_to DATETIME NULL, created_by INT NULL, updated_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY tax_country_airport (country_id, airport_id, active), KEY tax_validity (valid_from, valid_to)
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS reservation_tax_lines (
      id INT AUTO_INCREMENT PRIMARY KEY, reservation_id INT NOT NULL, passenger_id INT NOT NULL, flight_id INT NOT NULL,
      tax_rule_id INT NULL, country_id INT NULL, airport_id INT NULL, code VARCHAR(30) NOT NULL, name VARCHAR(120) NOT NULL,
      calculation_type ENUM('percentage','fixed') NOT NULL, rate DECIMAL(12,4) NOT NULL,
      taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0, amount DECIMAL(12,2) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY rtl_reservation (reservation_id), KEY rtl_segment (passenger_id, flight_id)
    )`);
    console.log('Migración de fiscalidad y tasas OK');
  } finally { await db.end(); }
})().catch((error) => { console.error('Error:', error.message); process.exit(1); });
