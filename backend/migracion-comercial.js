const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS ancillaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type ENUM('baggage','seat','meal','priority','other') NOT NULL,
    description VARCHAR(250) NULL,
    base_price DECIMAL(10,2) NOT NULL,
    active TINYINT(1) DEFAULT 1
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS flight_ancillaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    ancillary_id INT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    price_override DECIMAL(10,2) NULL,
    active TINYINT(1) DEFAULT 1,
    UNIQUE KEY fa_unique (flight_id, ancillary_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS reservation_ancillaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    passenger_id INT NULL,
    flight_id INT NOT NULL,
    ancillary_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('active','cancelled','refunded') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY ra_res (reservation_id), KEY ra_flight (flight_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS waitlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    passenger_name VARCHAR(150) NOT NULL,
    passenger_email VARCHAR(120) NULL,
    passenger_doc VARCHAR(30) NULL,
    doc_type VARCHAR(20) NULL,
    requested_class VARCHAR(10) NULL,
    position INT NOT NULL DEFAULT 0,
    status ENUM('waiting','offered','confirmed','notified','expired','cancelled') NOT NULL DEFAULT 'waiting',
    notes VARCHAR(250) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified_at DATETIME NULL,
    KEY wl_flight (flight_id), KEY wl_status (status)
  )`);
  // Compatibilidad: agregar columnas si la tabla waitlist ya existía sin ellas
  const [cols] = await pool.query('SHOW COLUMNS FROM waitlist');
  const have = new Set(cols.map((c) => c.Field));
  const add = [
    ['passenger_email', 'VARCHAR(120) NULL'],
    ['passenger_doc', 'VARCHAR(30) NULL'],
    ['doc_type', 'VARCHAR(20) NULL'],
    ['requested_class', 'VARCHAR(10) NULL'],
    ['position', 'INT NOT NULL DEFAULT 0'],
    ['notified_at', 'DATETIME NULL']
  ];
  for (const [name, def] of add) {
    if (!have.has(name)) await pool.query('ALTER TABLE waitlist ADD COLUMN ' + name + ' ' + def);
  }
  await pool.query("ALTER TABLE waitlist MODIFY COLUMN status ENUM('waiting','offered','confirmed','notified','expired','cancelled') NOT NULL DEFAULT 'waiting'");
  // Seed de ancillaries base
  await pool.query(`INSERT IGNORE INTO ancillaries (code, name, type, description, base_price) VALUES
    ('BAG23', 'Equipaje extra 23 kg', 'baggage', 'Maleta adicional hasta 23 kg en bodega', 35.00),
    ('BAG10', 'Equipaje de mano extra 10 kg', 'baggage', 'Segundo artículo de mano en cabina', 20.00),
    ('PRIOR', 'Abordaje prioritario', 'priority', 'Embarque antes del grupo general', 15.00),
    ('SEAT', 'Selección de asiento', 'seat', 'Elección de asiento específico', 10.00),
    ('MEAL', 'Comida especial', 'meal', 'Menú vegetariano, infantil o médico', 12.00)`);
  console.log('Migración comercial OK');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });