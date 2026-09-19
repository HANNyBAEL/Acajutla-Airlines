/**
 * QA-013 — Repara tarifas de vuelo cuya vigencia (valid_from) quedó en el
 * futuro. Con valid_from > NOW() la búsqueda de vuelos disponibles no las
 * ve (JOIN flight_fares exige valid_from <= NOW()) y el vuelo no aparece
 * en Nueva Reserva ni en la web, aunque exista en la base de datos.
 *
 * Regla: ninguna pantalla del sistema programa ventas futuras (los inserts
 * usan NOW()), así que todo valid_from futuro es un artefacto de datos.
 * Se retrasa al created_at de la fila cuando es conocido y pasado; si no,
 * a NOW().
 *
 * Uso: node migracion-fix-tarifas-vigentes.js
 */
const pool = require('./src/config/db');

(async () => {
  try {
    const [antes] = await pool.query(
      `SELECT COUNT(*) AS n FROM flight_fares ff
       WHERE ff.active = 1 AND ff.valid_from > NOW()`
    );
    console.log(`Tarifas activas con valid_from futuro: ${antes[0].n}`);

    if (antes[0].n === 0) {
      console.log('Nada que reparar.');
      await pool.end();
      return;
    }

    // Caso general: la fila tiene created_at ya pasado → la tarifa existía
    // desde entonces y su vigencia debía ser esa.
    const [r1] = await pool.query(
      `UPDATE flight_fares ff
       SET ff.valid_from = ff.created_at
       WHERE ff.active = 1 AND ff.valid_from > NOW()
         AND ff.created_at IS NOT NULL AND ff.created_at <= NOW()`
    );
    console.log(`Reparadas con valid_from = created_at: ${r1.affectedRows}`);

    // Fallback: filas sin created_at usable → vigentes desde ahora.
    const [r2] = await pool.query(
      `UPDATE flight_fares ff
       SET ff.valid_from = NOW()
       WHERE ff.active = 1 AND ff.valid_from > NOW()`
    );
    console.log(`Reparadas con valid_from = NOW(): ${r2.affectedRows}`);

    const [despues] = await pool.query(
      `SELECT COUNT(*) AS n FROM flight_fares ff
       WHERE ff.active = 1 AND ff.valid_from > NOW()`
    );
    console.log(`Tarifas activas con valid_from futuro restantes: ${despues[0].n}`);
    await pool.end();
  } catch (e) {
    console.error('Error en la migración:', e.message);
    process.exit(1);
  }
})();
