const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS dte_transmission_tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_type VARCHAR(8) NOT NULL,
    target INT NOT NULL,
    passed INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_doc (doc_type)
  )`);
  const T = { '01':90,'03':75,'04':50,'05':50,'06':25,'07':50,'08':75,'09':50,'11':90,'14':25,'15':25,'EV-INV':5,'EV-CON':5,'EV-RET':5,'EV-EOE':5 };
  for (const [k, v] of Object.entries(T)) {
    await pool.query('INSERT IGNORE INTO dte_transmission_tests (doc_type, target, passed) VALUES (?,?,0)', [k, v]);
  }
  const triggers = [
    ['trg_audit_no_update', 'UPDATE'],
    ['trg_audit_no_delete', 'DELETE']
  ];
  for (const [name, evt] of triggers) {
    const [ex] = await pool.query('SELECT COUNT(*) c FROM information_schema.triggers WHERE trigger_schema = DATABASE() AND trigger_name = ?', [name]);
    if (ex[0].c === 0) {
      await pool.query(`CREATE TRIGGER ${name} BEFORE ${evt} ON audit_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_logs es inmutable (RNF-006)'`);
    }
  }
  console.log('Migración Bloque E OK');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });