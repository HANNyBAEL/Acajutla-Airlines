const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS email_outbox (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    template VARCHAR(50) NOT NULL,
    to_email VARCHAR(150) NOT NULL,
    subject VARCHAR(250) NOT NULL,
    html MEDIUMTEXT,
    ref_type VARCHAR(30) DEFAULT NULL,
    ref_id VARCHAR(50) DEFAULT NULL,
    status ENUM('pending','sent','simulado','failed') NOT NULL DEFAULT 'pending',
    error_msg TEXT DEFAULT NULL,
    brevo_message_id VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_outbox_status (status),
    KEY idx_outbox_ref (ref_type, ref_id)
  )`);
  console.log('Tabla email_outbox verificada');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });