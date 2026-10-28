const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS flight_number_sequences (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      prefix VARCHAR(8) NOT NULL,
      last_number BIGINT UNSIGNED NOT NULL DEFAULT 0
    )`);

    const [maximos] = await db.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(flight_number, 3) AS UNSIGNED)), 0) AS last_number
      FROM flights
      WHERE flight_number REGEXP '^YS[0-9]+$'
    `);

    await db.query(
      `INSERT INTO flight_number_sequences (id, prefix, last_number)
       VALUES (1, 'YS', ?)
       ON DUPLICATE KEY UPDATE
         prefix = 'YS',
         last_number = GREATEST(last_number, VALUES(last_number))`,
      [maximos[0].last_number]
    );

    console.log(`Numeración automática inicializada: YS${String(Number(maximos[0].last_number) + 1).padStart(4, '0')} será el próximo número disponible.`);
  } finally {
    await db.end();
  }
})().catch((error) => {
  console.error('Error al inicializar la numeración automática:', error.message);
  process.exit(1);
});
