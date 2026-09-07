const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false },
  });

  const [fks] = await pool.query(
    "SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE " +
    "WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'employees' " +
    "AND COLUMN_NAME IN ('user_id','cancelled_by','processed_by','confirmed_by','issued_by')"
  );

  if (fks.length === 0) {
    console.log('No se encontraron FKs apuntando a employees. Nada que corregir.');
    process.exit(0);
  }

  for (const fk of fks) {
    console.log('Corrigiendo ' + fk.TABLE_NAME + '.' + fk.COLUMN_NAME + ' (' + fk.CONSTRAINT_NAME + ') -> users(id)');
    await pool.query('ALTER TABLE `' + fk.TABLE_NAME + '` DROP FOREIGN KEY `' + fk.CONSTRAINT_NAME + '`');
    await pool.query(
      'ALTER TABLE `' + fk.TABLE_NAME + '` ADD CONSTRAINT `' + fk.CONSTRAINT_NAME + '` ' +
      'FOREIGN KEY (`' + fk.COLUMN_NAME + '`) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL'
    );
  }

  console.log('✅ Foreign keys corregidas: ahora apuntan a users(id).');
  process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });