/**
 * Corrige tarifas activas que quedaron iguales al precio base del vuelo en
 * todas las clases. Las insertó migracion-tarifas-reservas.js para vuelos
 * ya existentes copiando f.base_price sin aplicar el multiplicador de la
 * clase, por lo que Nueva Reserva muestra el mismo precio sin importar la
 * clase elegida.
 *
 * Regla: solo se reprecian filas activas, de clase con multiplicador != 1,
 * cuyo precio sea exactamente el base del vuelo y que ningún usuario haya
 * versionado (updated_by IS NULL). Las tarifas editadas desde Operaciones
 * se respetan.
 *
 * Uso: node migracion-fix-tarifas-clases.js
 */
const pool = require('./src/config/db');

(async () => {
  try {
    const [antes] = await pool.query(
      `SELECT f.flight_number, fc.code, f.base_price, ff.price
       FROM flight_fares ff
       JOIN fare_classes fc ON fc.id = ff.fare_class_id
       JOIN flights f ON f.id = ff.flight_id
       WHERE ff.active = 1 AND fc.active = 1
         AND fc.multiplier <> 1
         AND ff.price = f.base_price
         AND ff.updated_by IS NULL
       ORDER BY f.flight_number, fc.code`
    );
    console.log(`Tarifas planas detectadas: ${antes.length}`);
    antes.forEach((r) => console.log(`  ${r.flight_number} ${r.code}: $${r.price} (base $${r.base_price})`));

    if (antes.length === 0) {
      console.log('Nada que corregir.');
      await pool.end();
      return;
    }

    const [r] = await pool.query(
      `UPDATE flight_fares ff
       JOIN fare_classes fc ON fc.id = ff.fare_class_id
       JOIN flights f ON f.id = ff.flight_id
       SET ff.price = ROUND(f.base_price * fc.multiplier, 2)
       WHERE ff.active = 1 AND fc.active = 1
         AND fc.multiplier <> 1
         AND ff.price = f.base_price
         AND ff.updated_by IS NULL`
    );
    console.log(`Tarifas repreciadas con base x multiplicador: ${r.affectedRows}`);

    const [despues] = await pool.query(
      `SELECT f.flight_number, fc.code, ff.price
       FROM flight_fares ff
       JOIN fare_classes fc ON fc.id = ff.fare_class_id
       JOIN flights f ON f.id = ff.flight_id
       WHERE ff.active = 1 AND fc.active = 1 AND fc.multiplier <> 1
         AND ff.price = f.base_price AND ff.updated_by IS NULL`
    );
    console.log(`Tarifas planas restantes: ${despues.length}`);
    await pool.end();
  } catch (e) {
    console.error('Error en la migración:', e.message);
    process.exit(1);
  }
})();
