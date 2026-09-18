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
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// Evita que un fallo de red en el pool tumbe todo el proceso Node.
pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('❌ [DB] Error en conexión del pool:', err.message);
  });
});

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ [DB] Conectado a MySQL Aiven correctamente');
    connection.release();
  } catch (error) {
    console.error('❌ [DB] Error al conectar a MySQL:', error.message);
    console.error('   Revisa en Aiven Console que el servicio MySQL esté Powered ON');
    console.error('   Host:', process.env.DB_HOST, 'Port:', process.env.DB_PORT);
  }
})();

module.exports = pool;
