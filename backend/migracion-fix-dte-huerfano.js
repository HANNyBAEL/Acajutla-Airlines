/**
 * Migración: reparar DTE huérfano y ampliar columnas DECIMAL en dte_items
 * 
 * Ejecutar: node migracion-fix-dte-huerfano.js
 * 
 * 1. Altera columnas DECIMAL(11,8) → DECIMAL(16,2) en dte_items
 * 2. Detecta DTEs huérfanos (transmitted + sin sello + sin items) y los
 *    marca como contingency para que aparezcan en el módulo de contingencia
 */
const pool = require('./src/config/db');

(async () => {
  try {
    console.log('=== Migración: Fix DTE huérfano + columnas DECIMAL ===\n');

    // 1. Ampliar columnas DECIMAL en dte_items
    console.log('1. Alterando columnas DECIMAL(11,8) → DECIMAL(16,2) en dte_items...');
    const columnas = [
      'quantity', 'unit_price', 'discount_amount',
      'sale_non_taxable', 'sale_exempt', 'sale_taxable', 'vat_item'
    ];
    for (const col of columnas) {
      await pool.query(`ALTER TABLE dte_items MODIFY ${col} DECIMAL(16,2) NOT NULL DEFAULT 0`);
      console.log(`   ✔ ${col} → DECIMAL(16,2)`);
    }

    // 2. Detectar DTEs huérfanos
    console.log('\n2. Buscando DTEs huérfanos (transmitted + sin sello + sin items)...');
    const [huerfanos] = await pool.query(`
      SELECT h.id, h.uuid_generation, h.control_number, h.reservation_id, h.emission_date
      FROM dte_headers h
      WHERE h.transmission_status = 'transmitted'
        AND h.reception_seal IS NULL
        AND NOT EXISTS (SELECT 1 FROM dte_items i WHERE i.header_id = h.id)
    `);

    if (huerfanos.length === 0) {
      console.log('   No se encontraron DTEs huérfanos.');
    } else {
      console.log(`   Encontrados ${huerfanos.length} DTE(s) huérfano(s):`);
      for (const d of huerfanos) {
        console.log(`   - ID: ${d.id} | Control: ${d.control_number} | Reserva: ${d.reservation_id} | Fecha: ${d.emission_date}`);
      }

      // Marcar como contingencia para que aparezcan en el módulo
      const ids = huerfanos.map((d) => d.id);
      await pool.query(
        `UPDATE dte_headers
         SET transmission_status = 'contingency',
             billing_model = 2,
             operation_type = 2
         WHERE id IN (?)`,
        [ids]
      );
      console.log(`   ✔ ${huerfanos.length} DTE(s) actualizados a status 'contingency'`);
      console.log('   → Ahora aparecerán en el módulo de contingencia para transmisión.');
    }

    // 3. Verificar DTEs transmitted con sello NULL (pero que sí tienen items)
    console.log('\n3. Verificando DTEs transmitted sin sello pero CON items...');
    const [conItems] = await pool.query(`
      SELECT h.id, h.control_number, h.reservation_id,
             (SELECT COUNT(*) FROM dte_items i WHERE i.header_id = h.id) AS items_count
      FROM dte_headers h
      WHERE h.transmission_status = 'transmitted'
        AND h.reception_seal IS NULL
        AND EXISTS (SELECT 1 FROM dte_items i WHERE i.header_id = h.id)
    `);
    if (conItems.length === 0) {
      console.log('   No se encontraron (OK).');
    } else {
      console.log(`   ⚠ Encontrados ${conItems.length} DTE(s) transmitted sin sello pero CON items:`);
      for (const d of conItems) {
        console.log(`   - ID: ${d.id} | Control: ${d.control_number} | Items: ${d.items_count}`);
      }
      // También moverlos a contingencia
      await pool.query(
        `UPDATE dte_headers SET transmission_status = 'contingency', billing_model = 2, operation_type = 2
         WHERE id IN (?)`,
        [conItems.map((d) => d.id)]
      );
      console.log(`   ✔ Actualizados a contingencia.`);
    }

    console.log('\n=== Migración completada exitosamente ===');
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  }
})();
