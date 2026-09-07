const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  const passwordHash = await bcrypt.hash('Admin123', 12);
  try {
    await pool.query(
      `INSERT INTO users (username, email, password_hash, role, status, mfa_enabled, mfa_required, created_at)
       VALUES ('admin', 'admin@acajutlaairlines.com', ?, 'admin', 'active', false, false, NOW())
       ON DUPLICATE KEY UPDATE password_hash = ?`,
      [passwordHash, passwordHash]
    );
    console.log('Usuario "admin" creado correctamente (Password: Admin123)');
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}
seed();
