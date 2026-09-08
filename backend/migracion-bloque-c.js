const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });

  await pool.query(`CREATE TABLE IF NOT EXISTS waitlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    passenger_name VARCHAR(150) NOT NULL,
    passenger_email VARCHAR(120) NULL,
    passenger_doc VARCHAR(30) NULL,
    doc_type VARCHAR(20) NULL,
    requested_class VARCHAR(10) NULL,
    position INT NOT NULL,
    status ENUM('waiting','notified','converted','expired','cancelled') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notified_at DATETIME NULL,
    KEY wl_flight (flight_id), KEY wl_status (status)
  )`);

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

  await pool.query(`CREATE TABLE IF NOT EXISTS reports_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_key VARCHAR(80) NOT NULL UNIQUE,
    payload LONGTEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until DATETIME NOT NULL
  )`);

  // Seed ancillaries base
  await pool.query(`INSERT IGNORE INTO ancillaries (code, name, type, description, base_price) VALUES
    ('BAG23', 'Equipaje extra 23 kg', 'baggage', 'Maleta adicional hasta 23 kg en bodega', 35.00),
    ('BAG32', 'Equipaje extra 32 kg', 'baggage', 'Maleta adicional hasta 33 kg en bodega', 55.00),
    ('SEAT-XL', 'Asiento XL (piernas extra)', 'seat', 'Fila con espacio extendido', 18.00),
    ('SEAT-WIN', 'Selección asiento ventanilla', 'seat', 'Garantiza asiento de ventanilla', 8.00),
    ('MEAL-VG', 'Comida vegetariana', 'meal', 'Menú vegetariano a bordo', 12.00),
    ('MEAL-VG', 'Comida vegana', 'meal', 'Menú vegano a bordo', 14.00),
    ('PRIO-1', 'Abordaje prioritario', 'priority', 'Embarque antes del grupo general', 10.00),
    ('LOUNGE', 'Acceso sala VIP', 'other', 'Acceso a sala VIP del aeropuerto de salida', 45.00)`);

  // Agregar columna channel a reservations si no existe
  const [cols] = await pool.query("SHOW COLUMNS FROM reservations LIKE 'channel'");
  if (cols.length === 0) {
    await pool.query("ALTER TABLE reservations ADD COLUMN channel VARCHAR(20) DEFAULT 'web'");
    console.log('Columna channel agregada a reservations');
  }

  console.log('Migración Bloque C OK');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });