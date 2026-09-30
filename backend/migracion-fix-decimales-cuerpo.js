const pool = require('./src/config/db');

(async () => {
  try {
    console.log('Iniciando migración de DECIMAL(16,8) en dte_items...');
    await pool.query(`
      ALTER TABLE dte_items
      MODIFY quantity DECIMAL(16,8) NOT NULL DEFAULT 1,
      MODIFY unit_price DECIMAL(16,8) NOT NULL DEFAULT 0,
      MODIFY discount_amount DECIMAL(16,8) NOT NULL DEFAULT 0,
      MODIFY sale_non_taxable DECIMAL(16,8) NOT NULL DEFAULT 0,
      MODIFY sale_exempt DECIMAL(16,8) NOT NULL DEFAULT 0,
      MODIFY sale_taxable DECIMAL(16,8) NOT NULL DEFAULT 0,
      MODIFY vat_item DECIMAL(16,8) NOT NULL DEFAULT 0
    `);
    console.log('Migración completada con éxito.');
  } catch (error) {
    console.error('Error durante la migración:', error.message);
  } finally {
    process.exit();
  }
})();
