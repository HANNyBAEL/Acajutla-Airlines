const pool = require('./src/config/db');

(async () => {
  const [columns] = await pool.query('SHOW COLUMNS FROM customers LIKE \'birth_date\'');
  if (!columns.length) {
    await pool.query('ALTER TABLE customers ADD COLUMN birth_date DATE NULL AFTER document_number');
    console.log('Columna customers.birth_date creada');
  } else {
    console.log('Columna customers.birth_date ya existe');
  }
  process.exit(0);
})().catch((error) => { console.error('Error:', error.message); process.exit(1); });
