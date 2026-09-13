const pool = require('../config/db');

const KEY = 'mh_simulado_operativo';

// El simulador conserva el estado en configuración para que todos los procesos
// vean la misma disponibilidad, no sólo el proceso que atendió el pago.
async function estaOperativo() {
  try {
    const [rows] = await pool.query('SELECT param_value FROM config_params WHERE param_key = ?', [KEY]);
    return !rows.length || String(rows[0].param_value).toLowerCase() !== 'false';
  } catch (error) {
    // Instalaciones antiguas sin config_params continúan operando normalmente.
    return true;
  }
}

async function obtenerEstado() {
  return { operativo: await estaOperativo(), reintentosConfigurados: 3 };
}

async function cambiarEstado(operativo) {
  const value = operativo ? 'true' : 'false';
  await pool.query(
    `INSERT INTO config_params (param_key, param_value, description)
     VALUES (?, ?, 'Disponibilidad del Ministerio de Hacienda simulado para DTE')
     ON DUPLICATE KEY UPDATE param_value = VALUES(param_value), description = VALUES(description)`,
    [KEY, value]
  );
  return obtenerEstado();
}

module.exports = { estaOperativo, obtenerEstado, cambiarEstado };
