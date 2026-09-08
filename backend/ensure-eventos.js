const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS contingency_events (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    tipo_contingencia TINYINT NOT NULL,
    motivo_contingencia VARCHAR(500) DEFAULT NULL,
    responsable_nombre VARCHAR(100) NOT NULL,
    responsable_tipo_doc CHAR(2) NOT NULL,
    responsable_num_doc VARCHAR(25) NOT NULL,
    documentos_count INT NOT NULL DEFAULT 0,
    estado ENUM('transmitido','aceptado','rechazado') NOT NULL DEFAULT 'transmitido',
    sello VARCHAR(40) DEFAULT NULL,
    full_json JSON DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_uuid (uuid)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS contingency_event_docs (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id INT UNSIGNED NOT NULL,
    dte_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (id), KEY idx_event (event_id)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS dte_invalidation_events (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    uuid CHAR(36) NOT NULL,
    dte_id INT UNSIGNED NOT NULL,
    tipo_invalidacion TINYINT NOT NULL,
    motivo VARCHAR(200) NOT NULL,
    responsable_nombre VARCHAR(100) NOT NULL,
    responsable_tipo_doc CHAR(2) NOT NULL,
    responsable_num_doc VARCHAR(20) NOT NULL,
    solicitante_nombre VARCHAR(100) NOT NULL,
    solicitante_tipo_doc CHAR(2) NOT NULL,
    solicitante_num_doc VARCHAR(20) NOT NULL,
    codigo_reemplazo CHAR(36) DEFAULT NULL,
    estado ENUM('transmitido','aceptado','rechazado') NOT NULL DEFAULT 'transmitido',
    sello VARCHAR(40) DEFAULT NULL,
    full_json JSON DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), UNIQUE KEY uk_uuid (uuid)
  )`);
  console.log('Tablas de eventos DTE verificadas');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });