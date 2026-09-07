const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false },
  });

  console.log('Ajustando columna result en audit_logs...');
  try {
    await pool.query("ALTER TABLE audit_logs MODIFY COLUMN `result` VARCHAR(20)");
    console.log('✅ Columna "result" ajustada correctamente a VARCHAR(20).');
  } catch (e) {
    console.log('⚠️ Detalle:', e.message);
  }
  
  process.exit(0);
})();