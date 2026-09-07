const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  console.log('=== ESTRUCTURA ACTUAL DE reservations ===');
  const [rows] = await pool.query('SHOW CREATE TABLE reservations');
  console.log(rows[0]['Create Table']);

  console.log('');
  console.log('=== TRIGGERS EN reservations ===');
  const [trgs] = await pool.query(
    "SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, ACTION_STATEMENT FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'reservations'"
  );
  if (trgs.length === 0) console.log('(sin triggers)');
  trgs.forEach((t) => console.log(t.TRIGGER_NAME, t.ACTION_TIMING, t.EVENT_MANIPULATION, '->', t.ACTION_STATEMENT));

  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservations' AND COLUMN_NAME = 'characters'"
  );

  if (cols.length > 0) {
    await pool.query('ALTER TABLE reservations DROP COLUMN `characters`');
    console.log('');
    console.log('✅ Columna "characters" eliminada de reservations. Problema resuelto.');
  } else {
    console.log('');
    console.log('ℹ️ La columna "characters" NO está en reservations directamente.');
    let fix = false;
    for (const t of trgs) {
      if (/characters/i.test(t.ACTION_STATEMENT)) {
        await pool.query('DROP TRIGGER `' + t.TRIGGER_NAME + '`');
        console.log('✅ Trigger problemático eliminado: ' + t.TRIGGER_NAME);
        fix = true;
      }
    }
    if (!fix) console.log('⚠️ No se encontró el origen. Copia la estructura mostrada arriba y envíamela.');
  }

  process.exit(0);
})().catch((e) => {
  console.error('Error de diagnóstico:', e.message);
  process.exit(1);
});