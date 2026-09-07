const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  const [r] = await pool.query('UPDATE users SET blocked_until = NULL, failed_attempts = 0');
  console.log('Usuarios desbloqueados: ' + r.affectedRows);
  process.exit(0);
})();