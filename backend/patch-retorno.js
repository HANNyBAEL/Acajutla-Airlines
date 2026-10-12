const pool = require('./src/config/db');

async function patch() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dte_return_events (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        uuid VARCHAR(36) NOT NULL,
        dte_id INT UNSIGNED NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        responsable_nombre VARCHAR(150),
        responsable_tipo_doc VARCHAR(2),
        responsable_num_doc VARCHAR(20),
        returned_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        estado VARCHAR(20) DEFAULT 'aceptado',
        sello VARCHAR(50),
        full_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dte_id) REFERENCES dte_headers(id)
      );
    `);
    const [columns] = await pool.query('SHOW COLUMNS FROM dte_return_events');
    if (!columns.some((column) => column.Field === 'returned_amount')) {
      await pool.query('ALTER TABLE dte_return_events ADD COLUMN returned_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER responsable_num_doc');
    }
    // Antes el sistema registraba el evento sin monto por DTE. Impedir que
    // esos documentos se reembolsen de nuevo hasta que el historial se revise.
    await pool.query(
      `UPDATE dte_return_events e
       JOIN dte_headers h ON h.id = e.dte_id
       SET e.returned_amount = h.total_to_pay
       WHERE e.returned_amount = 0`
    );
    console.log('Tabla dte_return_events verificada y montos históricos conciliados de forma conservadora.');
  } catch (err) {
    console.error('Error creando tabla:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

patch();
