const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });

  await pool.query(`CREATE TABLE IF NOT EXISTS payments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    reservation_id INT UNSIGNED NOT NULL,
    original_payment_id INT UNSIGNED DEFAULT NULL,
    method ENUM('card','transfer','cash','paypal') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status ENUM('pending_confirmation','approved','rejected','refunded','cancelled','pending','paid') NOT NULL DEFAULT 'approved',
    type ENUM('payment','refund') NOT NULL DEFAULT 'payment',
    external_reference VARCHAR(100) DEFAULT NULL,
    authorization_code VARCHAR(50) DEFAULT NULL,
    card_last_digits CHAR(4) DEFAULT NULL,
    card_brand VARCHAR(20) DEFAULT NULL,
    gateway_data JSON DEFAULT NULL,
    reason VARCHAR(500) DEFAULT NULL,
    processed_by INT UNSIGNED DEFAULT NULL,
    confirmed_by INT UNSIGNED DEFAULT NULL,
    confirmation_date DATETIME DEFAULT NULL,
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pay_reservation (reservation_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS dte_headers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid_generation CHAR(36) NOT NULL,
    dte_type CHAR(2) NOT NULL,
    control_number VARCHAR(31) NOT NULL,
    annual_correlative INT UNSIGNED NOT NULL DEFAULT 1,
    emission_date DATE NOT NULL,
    emission_time TIME NOT NULL,
    environment CHAR(2) NOT NULL DEFAULT '00',
    billing_model TINYINT NOT NULL DEFAULT 1,
    operation_type TINYINT NOT NULL DEFAULT 1,
    transmission_status ENUM('draft','transmitted','accepted','rejected','contingency','invalidated') NOT NULL DEFAULT 'transmitted',
    reception_seal VARCHAR(40) DEFAULT NULL,
    reception_date DATETIME DEFAULT NULL,
    reservation_id INT UNSIGNED DEFAULT NULL,
    full_json JSON DEFAULT NULL,
    issuer_nit VARCHAR(14) DEFAULT NULL,
    issuer_name VARCHAR(250) DEFAULT NULL,
    receiver_name VARCHAR(250) DEFAULT NULL,
    receiver_doc_type CHAR(2) DEFAULT NULL,
    receiver_doc_number VARCHAR(20) DEFAULT NULL,
    total_non_taxable DECIMAL(11,2) NOT NULL DEFAULT 0.00,
    total_exempt DECIMAL(11,2) NOT NULL DEFAULT 0.00,
    total_taxable DECIMAL(11,2) NOT NULL DEFAULT 0.00,
    total_vat DECIMAL(11,2) NOT NULL DEFAULT 0.00,
    total_to_pay DECIMAL(11,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_uuid (uuid_generation),
    UNIQUE KEY uk_control (control_number),
    KEY idx_dte_reservation (reservation_id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS dte_items (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    header_id INT UNSIGNED NOT NULL,
    item_number INT NOT NULL,
    item_type TINYINT NOT NULL DEFAULT 2,
    quantity DECIMAL(11,8) NOT NULL DEFAULT 1,
    unit_measure INT NOT NULL DEFAULT 99,
    description VARCHAR(1500) NOT NULL,
    unit_price DECIMAL(11,8) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(11,8) NOT NULL DEFAULT 0,
    sale_non_taxable DECIMAL(11,8) NOT NULL DEFAULT 0,
    sale_exempt DECIMAL(11,8) NOT NULL DEFAULT 0,
    sale_taxable DECIMAL(11,8) NOT NULL DEFAULT 0,
    vat_item DECIMAL(11,8) NOT NULL DEFAULT 0,
    tribute_code CHAR(2) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_item_header (header_id)
  )`);

  console.log('Tablas payments / dte_headers / dte_items verificadas');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });