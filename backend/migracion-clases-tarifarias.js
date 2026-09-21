const mysql = require('mysql2/promise');
require('dotenv').config();

// Clases estándar del sistema (los códigos que usa src/utils/fareClass.js).
// Al crear un vuelo, cada tarifa nace como precio base × multiplicador.
const CLASES_ESTANDAR = [
  { code: 'ECONOMICA', name: 'Económica', multiplier: 1.00, conditions: 'Tarifa base' },
  { code: 'PREMIUM', name: 'Premium', multiplier: 1.35, conditions: 'Mayor espacio entre asientos y servicios mejorados' },
  { code: 'BUSINESS', name: 'Business (Ejecutiva)', multiplier: 1.90, conditions: 'Asientos reclinables y prioridad de embarque' },
  { code: 'PRIMERA', name: 'Primera Clase', multiplier: 2.60, conditions: 'Máximo confort y servicio personalizado' }
];

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  try {
    for (const clase of CLASES_ESTANDAR) {
      const [existe] = await db.query('SELECT id FROM fare_classes WHERE code = ?', [clase.code]);
      if (existe.length === 0) {
        await db.query(
          'INSERT INTO fare_classes (code, name, multiplier, conditions, active) VALUES (?, ?, ?, ?, 1)',
          [clase.code, clase.name, clase.multiplier, clase.conditions]
        );
        console.log('Clase creada: ' + clase.code + ' (x' + clase.multiplier + ')');
      } else {
        await db.query('UPDATE fare_classes SET multiplier = ?, active = 1 WHERE code = ?', [clase.multiplier, clase.code]);
        console.log('Clase actualizada: ' + clase.code + ' (x' + clase.multiplier + ')');
      }
    }
    console.log('Migración de clases tarifarias OK');
  } finally {
    await db.end();
  }
})().catch((error) => { console.error('Error:', error.message); process.exit(1); });
