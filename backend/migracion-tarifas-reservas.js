const mysql = require('mysql2/promise');
require('dotenv').config();

const columnExists = async (db, table, column) => {
  const [rows] = await db.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
};

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  try {
    // Una fila representa una versión de tarifa. Las versiones anteriores quedan
    // inactivas para que la venta y la auditoría sean reproducibles.
    for (const [column, ddl] of [
      ['active', 'TINYINT(1) NOT NULL DEFAULT 1'],
      ['valid_from', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'],
      ['valid_to', 'DATETIME NULL'],
      ['created_by', 'INT NULL'],
      ['updated_by', 'INT NULL'],
      ['created_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'],
      ['updated_at', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP']
    ]) {
      if (!(await columnExists(db, 'flight_fares', column))) {
        await db.query(`ALTER TABLE flight_fares ADD COLUMN ${column} ${ddl}`);
      }
    }

    // La restricción histórica impedía conservar versiones. Se elimina sólo si
    // existe con el nombre usado por la migración anterior.
    const [indexes] = await db.query("SHOW INDEX FROM flight_fares WHERE Key_name = 'ff_unique'");
    if (indexes.length) await db.query('ALTER TABLE flight_fares DROP INDEX ff_unique');
    const [activeIndex] = await db.query("SHOW INDEX FROM flight_fares WHERE Key_name = 'ff_flight_class_active'");
    if (!activeIndex.length) await db.query('CREATE INDEX ff_flight_class_active ON flight_fares (flight_id, fare_class_id, active)');
    // MySQL no tiene índices únicos parciales; esta columna generada obtiene el
    // mismo efecto: sólo las filas activas producen una clave única.
    if (!(await columnExists(db, 'flight_fares', 'active_fare_key'))) {
      await db.query(`ALTER TABLE flight_fares ADD COLUMN active_fare_key VARCHAR(64)
        GENERATED ALWAYS AS (CASE WHEN active = 1 THEN CONCAT(flight_id, ':', fare_class_id) ELSE NULL END) STORED`);
    }
    const [activeUnique] = await db.query("SHOW INDEX FROM flight_fares WHERE Key_name = 'ff_one_active'");
    if (!activeUnique.length) await db.query('CREATE UNIQUE INDEX ff_one_active ON flight_fares (active_fare_key)');

    // Los vuelos ya existentes reciben una tarifa inicial por cada clase
    // activa. Después se pueden versionar desde Operaciones sin afectar ventas.
    await db.query(
      `INSERT INTO flight_fares (flight_id, fare_class_id, price, seats_allocated, active, valid_from)
       SELECT f.id, fc.id, f.base_price, 0, 1, NOW()
       FROM flights f CROSS JOIN fare_classes fc
       LEFT JOIN flight_fares ff ON ff.flight_id = f.id AND ff.fare_class_id = fc.id AND ff.active = 1
       WHERE fc.active = 1 AND ff.id IS NULL`
    );

    for (const [column, ddl] of [
      ['fare_id', 'INT NULL'],
      ['unit_price', 'DECIMAL(10,2) NULL'],
      ['total_price', 'DECIMAL(10,2) NULL']
    ]) {
      if (!(await columnExists(db, 'flight_segments', column))) {
        await db.query(`ALTER TABLE flight_segments ADD COLUMN ${column} ${ddl}`);
      }
    }

    // Las reservas históricas ya están congeladas en estimated_total. El detalle
    // nuevo se guarda por segmento, sin recalcular ventas existentes.
    console.log('Migración de tarifas versionadas y snapshots de reserva OK');
  } finally {
    await db.end();
  }
})().catch((error) => { console.error('Error:', error.message); process.exit(1); });
