const mysql = require('mysql2/promise');
require('dotenv').config();
require('./simulation').protegerRed();
const fs = require('node:fs');
const path = require('node:path');
const caPath = process.env.DB_SSL_CA_PATH || path.resolve(__dirname, '../../../Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/ca.pem');

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
  timezone: '-06:00',
  dateStrings: true,
  ssl: {
    rejectUnauthorized: true,
    ...(fs.existsSync(caPath) ? { ca: fs.readFileSync(caPath, 'utf8') } : {})
  }
});

// Evita que un fallo de red en el pool tumbe todo el proceso Node.
pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('❌ [DB] Error en conexión del pool:', err.message);
  });
});

module.exports = pool;
