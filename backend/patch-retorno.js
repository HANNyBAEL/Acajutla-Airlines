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
        estado VARCHAR(20) DEFAULT 'aceptado',
        sello VARCHAR(50),
        full_json JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dte_id) REFERENCES dte_headers(id)
      );
    `);
    console.log('Tabla dte_return_events creada correctamente.');
  } catch (err) {
    console.error('Error creando tabla:', err);
  } finally {
    process.exit(0);
  }
}

patch();
