const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS ancillary_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(250),
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    tipo VARCHAR(30) NOT NULL DEFAULT 'other',
    active TINYINT(1) NOT NULL DEFAULT 1
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS reservation_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    passenger_id INT NULL,
    service_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_rs_res (reservation_id),
    KEY idx_rs_pax (passenger_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS waitlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    customer_id INT NULL,
    passenger_name VARCHAR(200),
    contact VARCHAR(150),
    status ENUM('waiting','offered','confirmed','expired') NOT NULL DEFAULT 'waiting',
    notes VARCHAR(250),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_wl_flight (flight_id)
  )`);
  await pool.query(`INSERT IGNORE INTO ancillary_services (code, name, description, price, tipo, active) VALUES
    ('BAG25', 'Equipaje extra 25kg', 'Maleta adicional de hasta 25kg en bodega', 40.00, 'baggage', 1),
    ('BAG10', 'Equipaje de mano extra 10kg', 'Segundo artículo de mano en cabina', 20.00, 'baggage', 1),
    ('PRIOR', 'Abordaje prioritario', 'Acceso al grupo 1 de abordaje', 15.00, 'priority', 1),
    ('SEAT', 'Selección de asiento', 'Elección de asiento específico (incluye emergencia si aplica)', 10.00, 'seat', 1),
    ('MEAL', 'Comida especial', 'Menú vegetariano, infantil o médico', 12.00, 'meal', 1)`);
  console.log('Migración comercial + seed OK');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });