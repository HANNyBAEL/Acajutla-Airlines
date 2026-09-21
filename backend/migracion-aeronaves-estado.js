const mysql = require('mysql2/promise');
require('dotenv').config();

const columnExists = async (db, table, column) => {
  const [rows] = await db.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
};

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  try {
    // Los tipos de aeronave no se eliminan (vuelos y aeronaves los referencian);
    // sólo se desactivan para excluirlos de registros nuevos.
    if (!(await columnExists(db, 'aircraft_types', 'active'))) {
      await db.query('ALTER TABLE aircraft_types ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1');
      console.log('Columna aircraft_types.active agregada');
    } else {
      console.log('Columna aircraft_types.active ya existía');
    }
    console.log('Migración de estado de aeronaves OK');
  } finally {
    await db.end();
  }
})().catch((error) => { console.error('Error:', error.message); process.exit(1); });
