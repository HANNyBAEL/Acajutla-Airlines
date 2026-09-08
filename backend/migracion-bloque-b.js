const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS crew_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NULL,
    full_name VARCHAR(150) NOT NULL,
    license_type VARCHAR(50) NULL,
    license_number VARCHAR(50) NULL,
    license_expiry DATE NULL,
    role_operativo ENUM('pilot','copilot','cabin','maintenance') NOT NULL,
    qualifications JSON NULL,
    active TINYINT(1) DEFAULT 1
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS flight_crew (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    crew_member_id INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    duty_start DATETIME NULL,
    duty_end DATETIME NULL,
    KEY fc_flight (flight_id), KEY fc_crew (crew_member_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS fare_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    multiplier DECIMAL(5,2) DEFAULT 1.00,
    conditions VARCHAR(250) NULL,
    active TINYINT(1) DEFAULT 1
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS flight_fares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    fare_class_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    seats_allocated INT DEFAULT 0,
    seats_sold INT DEFAULT 0,
    UNIQUE KEY ff_unique (flight_id, fare_class_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS airport_facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    airport_id INT NOT NULL,
    type ENUM('terminal','gate','checkin_point') NOT NULL,
    code VARCHAR(20) NOT NULL,
    active TINYINT(1) DEFAULT 1,
    KEY af_airport (airport_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS config_params (
    param_key VARCHAR(60) PRIMARY KEY,
    param_value VARCHAR(250) NOT NULL,
    description VARCHAR(250) NULL
  )`);
  await pool.query(`INSERT IGNORE INTO config_params (param_key, param_value, description) VALUES
    ('reserva_time_limit_min','30','Time limit de reservas sin pagar (RN-COM-01)'),
    ('turnaround_min','45','Turnaround mínimo de aeronave en minutos (RN-OP-02)'),
    ('crew_rest_hours','10','Descanso mínimo entre deberes de tripulación'),
    ('contingencia_umbral_fallos','3','Fallos consecutivos para pasar a contingencia (RF-003)'),
    ('contingencia_timeout_seg','30','Timeout de transmisión en segundos (RF-003)')`);
  await pool.query(`CREATE TABLE IF NOT EXISTS dte_trace (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dte_uuid VARCHAR(36) NOT NULL,
    stage VARCHAR(30) NOT NULL,
    detail JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY dt_uuid (dte_uuid)
  )`);
  console.log('Migración Bloque B OK');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });