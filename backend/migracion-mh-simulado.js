const pool = require('./src/config/db');

(async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS config_params (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    param_key VARCHAR(100) NOT NULL,
    param_value VARCHAR(500) DEFAULT NULL,
    description VARCHAR(500) DEFAULT NULL,
    PRIMARY KEY (id), UNIQUE KEY uk_config_param_key (param_key)
  )`);
  await pool.query(`INSERT IGNORE INTO config_params (param_key, param_value, description)
    VALUES ('mh_simulado_operativo', 'true', 'Disponibilidad del Ministerio de Hacienda simulado para DTE')`);
  console.log('Configuración MH simulada verificada');
  process.exit(0);
})().catch((error) => { console.error('Error:', error.message); process.exit(1); });
