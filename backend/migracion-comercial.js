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
    default_stock INT NOT NULL DEFAULT 0,
    iva_incluido TINYINT(1) NOT NULL DEFAULT 0,
    active TINYINT(1) DEFAULT 1
  )`);
  const [ancillaryColumns] = await pool.query('SHOW COLUMNS FROM ancillaries');
  if (!ancillaryColumns.some((column) => column.Field === 'default_stock')) {
    await pool.query('ALTER TABLE ancillaries ADD COLUMN default_stock INT NOT NULL DEFAULT 0 AFTER base_price');
  }
  if (!ancillaryColumns.some((column) => column.Field === 'iva_incluido')) {
    await pool.query('ALTER TABLE ancillaries ADD COLUMN iva_incluido TINYINT(1) NOT NULL DEFAULT 0 AFTER default_stock');
  }
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
    iva_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('active','cancelled','refunded') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY ra_res (reservation_id), KEY ra_flight (flight_id)
  )`);
  const [reservationAncillaryColumns] = await pool.query('SHOW COLUMNS FROM reservation_ancillaries');
  if (!reservationAncillaryColumns.some((column) => column.Field === 'iva_amount')) {
    await pool.query('ALTER TABLE reservation_ancillaries ADD COLUMN iva_amount DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price');
  }
  // Seed de ancillaries base
  await pool.query(`INSERT IGNORE INTO ancillaries (code, name, type, description, base_price, default_stock) VALUES
    ('BAG23', 'Equipaje extra 23 kg', 'baggage', 'Maleta adicional hasta 23 kg en bodega', 35.00, 180),
    ('BAG10', 'Equipaje de mano extra 10 kg', 'baggage', 'Segundo artículo de mano en cabina', 20.00, 180),
    ('PRIOR', 'Abordaje prioritario', 'priority', 'Embarque antes del grupo general', 15.00, 180),
    ('SEAT', 'Selección de asiento', 'seat', 'Elección de asiento específico', 10.00, 180),
    ('MEAL', 'Comida especial', 'meal', 'Menú vegetariano, infantil o médico', 12.00, 180)`);
  // Los servicios base deben tener inventario inicial para asignarse automáticamente.
  await pool.query(`UPDATE ancillaries SET default_stock = 180
    WHERE code IN ('BAG23', 'BAG10', 'PRIOR', 'SEAT', 'MEAL') AND default_stock = 0`);
  await pool.query(
    `INSERT IGNORE INTO flight_ancillaries (flight_id, ancillary_id, stock, price_override, active)
     SELECT f.id, a.id, a.default_stock, NULL, 1
     FROM flights f CROSS JOIN ancillaries a
     WHERE f.status = 'scheduled' AND f.departure_datetime > NOW()
       AND a.active = 1 AND a.default_stock > 0`
  );
  console.log('Migración comercial OK');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
