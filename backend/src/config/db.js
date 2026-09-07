const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ [DB] Conectado a MySQL Aiven correctamente');
    connection.release();
  } catch (error) {
    console.error('❌ [DB] Error al conectar a MySQL:', error.message);
  }
})();

module.exports = pool;