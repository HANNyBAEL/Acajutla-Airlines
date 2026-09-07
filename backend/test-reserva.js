const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false },
  });
  const conn = await pool.getConnection();
  try {
    console.log('=== TEST DE CREACION DE RESERVA (PASO A PASO) ===');

    const [vuelos] = await conn.query("SELECT id, flight_number, base_price FROM flights WHERE status IN ('scheduled','confirmed') LIMIT 1");
    if (vuelos.length === 0) { console.log('❌ No hay vuelos disponibles en la BD'); process.exit(1); }
    const vuelo = vuelos[0];
    console.log('✅ Paso 1 - Vuelo encontrado: ' + vuelo.flight_number + ' (id ' + vuelo.id + ')');

    const [clientes] = await conn.query('SELECT id, first_names FROM customers LIMIT 1');
    if (clientes.length === 0) { console.log('❌ No hay clientes en la BD'); process.exit(1); }
    const cliente = clientes[0];
    console.log('✅ Paso 2 - Cliente encontrado: ' + cliente.first_names + ' (id ' + cliente.id + ')');

    await conn.beginTransaction();

    const [cap] = await conn.query(
      'SELECT at.total_capacity FROM flights f JOIN aircraft ac ON f.aircraft_id = ac.id JOIN aircraft_types at ON ac.type_id = at.id WHERE f.id = ?',
      [vuelo.id]
    );
    console.log('✅ Paso 3 - Capacidad de aeronave: ' + (cap[0] ? cap[0].total_capacity : 'SIN DATO (¿aeronave sin tipo?)'));

    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pnr = '';
    for (let i = 0; i < 6; i++) pnr += caracteres[Math.floor(Math.random() * caracteres.length)];
    console.log('✅ Paso 4 - PNR generado: ' + pnr);

    const [r1] = await conn.query(
      "INSERT INTO reservations (pnr, customer_id, user_id, status, estimated_total, currency, created_at, time_limit) VALUES (?, ?, NULL, 'pending', ?, 'USD', NOW(), DATE_ADD(NOW(), INTERVAL 30 MINUTE))",
      [pnr, cliente.id, vuelo.base_price]
    );
    const reservaId = r1.insertId;
    console.log('✅ Paso 5 - Reserva insertada (id ' + reservaId + ')');

    const [r2] = await conn.query(
      "INSERT INTO passengers (reservation_id, passenger_type, first_names, last_names, document_type, document_number, birth_date, nationality) VALUES (?, 'adult', 'Prueba', 'Test', '13', '00000000-0', '1990-01-01', 'SV')",
      [reservaId]
    );
    const paxId = r2.insertId;
    console.log('✅ Paso 6 - Pasajero insertado (id ' + paxId + ')');

    const [r3] = await conn.query(
      "INSERT INTO flight_segments (reservation_id, passenger_id, flight_id, fare_class, seat) VALUES (?, ?, ?, 'economy', NULL)",
      [reservaId, paxId, vuelo.id]
    );
    console.log('✅ Paso 7 - Segmento de vuelo insertado (id ' + r3.insertId + ')');

    await conn.rollback();
    console.log('');
    console.log('🎉 TODO OK a nivel de base de datos (se hizo rollback, no se guardó nada).');
    console.log('👉 Si esto pasa pero la web falla, el problema está en el controlador o en los datos que envía el frontend.');
  } catch (e) {
    await conn.rollback().catch(() => {});
    console.log('');
    console.log('❌ ERROR DETECTADO: ' + e.message);
    if (e.code) console.log('   Código: ' + e.code);
    if (e.sql) console.log('   SQL: ' + e.sql);
  } finally {
    conn.release();
    process.exit(0);
  }
})();