const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { expirarReservas } = require('../src/services/expiracionService');
const Vuelo = require('../src/models/Vuelo');
const FlightSegment = require('../src/models/FlightSegment');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  console.log('🧪 Iniciando verificación de fixes de auditoría...\n');
  let failures = 0;

  // TEST 1: Expiración de reservas
  try {
    console.log('--- TEST 1: Expiración de reservas vencidas ---');
    const [c] = await pool.query('SELECT id FROM customers LIMIT 1');
    const [f] = await pool.query("SELECT id, flight_number FROM flights WHERE status IN ('scheduled','confirmed') LIMIT 1");
    if (!c.length || !f.length) throw new Error('Faltan clientes o vuelos para el test');

    const testPNR = 'EXP' + Math.floor(100 + Math.random() * 899);
    const [insRes] = await pool.query(
      "INSERT INTO reservations (pnr, customer_id, status, estimated_total, currency, created_at, time_limit) VALUES (?, ?, 'pending', 100, 'USD', DATE_SUB(NOW(), INTERVAL 60 MINUTE), DATE_SUB(NOW(), INTERVAL 30 MINUTE))",
      [testPNR, c[0].id]
    );
    const resId = insRes.insertId;

    const [insPax] = await pool.query(
      "INSERT INTO passengers (reservation_id, passenger_type, first_names, last_names, document_type, document_number) VALUES (?, 'adult', 'Test', 'Expire', '13', '00000000-0')",
      [resId]
    );
    const paxId = insPax.insertId;

    const [insSeg] = await pool.query(
      "INSERT INTO flight_segments (reservation_id, passenger_id, flight_id, fare_class, seat) VALUES (?, ?, ?, 'economy', '99Z')",
      [resId, paxId, f[0].id]
    );

    console.log(`  Creada reserva de prueba ${testPNR} (id: ${resId}) con time_limit vencido y asiento 99Z`);

    // Ejecutar expiración
    const resExpiracion = await expirarReservas();
    console.log('  Resultado expirarReservas():', resExpiracion);

    const [checkRes] = await pool.query('SELECT status, cancellation_reason FROM reservations WHERE id = ?', [resId]);
    const [checkSeg] = await pool.query('SELECT id FROM flight_segments WHERE reservation_id = ?', [resId]);

    if (checkRes[0].status === 'expired' && checkSeg.length === 0) {
      console.log('  ✅ TEST 1 PASÓ: Reserva expirada y segmentos eliminados correctamente.');
    } else {
      console.error('  ❌ TEST 1 FALLÓ: Estado ' + checkRes[0].status + ', segmentos restantes: ' + checkSeg.length);
      failures++;
    }

    // Limpieza
    await pool.query('DELETE FROM passengers WHERE id = ?', [paxId]);
    await pool.query('DELETE FROM reservations WHERE id = ?', [resId]);
  } catch (err) {
    console.error('  ❌ TEST 1 ERROR:', err.message);
    failures++;
  }

  // TEST 2: Conteo unificado de asientos (buscarDisponibles vs validarDisponibilidad)
  try {
    console.log('\n--- TEST 2: Unificación de conteo de asientos ---');
    const [vuelos] = await pool.query(
      `SELECT f.id, f.flight_number, DATE(f.departure_datetime) as f_fecha,
              ao.iata_code AS orig, ad.iata_code AS dest
       FROM flights f
       JOIN routes r ON r.id = f.route_id
       JOIN airports ao ON ao.id = r.origin_id
       JOIN airports ad ON ad.id = r.destination_id
       WHERE f.status = 'scheduled' AND f.departure_datetime > NOW()
       LIMIT 1`
    );

    if (vuelos.length) {
      const v = vuelos[0];
      const fechaStr = new Date(v.f_fecha).toISOString().slice(0, 10);
      const dispVuelo = await Vuelo.buscarDisponibles(v.orig, v.dest, fechaStr);
      const encontrado = dispVuelo.find((x) => x.id === v.id);

      const dispSegment = await FlightSegment.validarDisponibilidad(v.id, 'economy');

      console.log(`  Vuelo ${v.flight_number}:`);
      console.log(`    Vuelo.buscarDisponibles -> disponibles: ${encontrado ? encontrado.available_seats : 'No en lista'}`);
      console.log(`    FlightSegment.validarDisponibilidad -> disponibles: ${dispSegment.available_seats}`);

      if (encontrado && encontrado.available_seats === dispSegment.available_seats) {
        console.log('  ✅ TEST 2 PASÓ: La disponibilidad es 100% idéntica entre búsqueda y creación.');
      } else if (!encontrado) {
        console.log('  ⚠️ TEST 2 AVISO: Vuelo no retornado por fecha/hora en buscarDisponibles, pero la consulta fue ejecutada.');
      } else {
        console.error('  ❌ TEST 2 FALLÓ: Discrepancia detectada.');
        failures++;
      }
    } else {
      console.log('  ℹ️ No hay vuelos scheduled futuros para el test 2.');
    }
  } catch (err) {
    console.error('  ❌ TEST 2 ERROR:', err.message);
    failures++;
  }

  // TEST 3: Validación de rechazo en pago de reserva expirada
  try {
    console.log('\n--- TEST 3: Rechazo de pago en reserva expirada ---');
    const paymentService = require('../src/services/paymentService');
    const [c] = await pool.query('SELECT id FROM customers LIMIT 1');
    const testPNR = 'PAY' + Math.floor(100 + Math.random() * 899);
    const [insRes] = await pool.query(
      "INSERT INTO reservations (pnr, customer_id, status, estimated_total, currency, created_at, time_limit) VALUES (?, ?, 'expired', 150, 'USD', NOW(), DATE_SUB(NOW(), INTERVAL 10 MINUTE))",
      [testPNR, c[0].id]
    );

    let rejected = false;
    try {
      await paymentService.procesarPago({ reservation_id: insRes.insertId, amount: 150, method: 'cash' }, { id: 1 });
    } catch (payErr) {
      rejected = true;
      console.log('  Pago rechazado con mensaje esperado:', payErr.message);
    }

    if (rejected) {
      console.log('  ✅ TEST 3 PASÓ: Pago en reserva expirada rechazado correctamente.');
    } else {
      console.error('  ❌ TEST 3 FALLÓ: Se permitió pagar una reserva expirada.');
      failures++;
    }

    await pool.query('DELETE FROM reservations WHERE id = ?', [insRes.insertId]);
  } catch (err) {
    console.error('  ❌ TEST 3 ERROR:', err.message);
    failures++;
  }

  // TEST 4: Cancelación de vuelo con reservas activas y reembolsos
  try {
    console.log('\n--- TEST 4: Cancelación de vuelo con reservas asociadas ---');
    const vuelosController = require('../src/controllers/vuelosController');
    const [c] = await pool.query('SELECT id FROM customers LIMIT 1');
    const [a] = await pool.query("SELECT id FROM aircraft WHERE status = 'available' LIMIT 1");
    const [r] = await pool.query("SELECT id FROM routes LIMIT 1");

    if (c.length && a.length && r.length) {
      // Crear vuelo temporal
      const testFlightNum = 'TEST' + Math.floor(100 + Math.random() * 899);
      const [insFlight] = await pool.query(
        "INSERT INTO flights (route_id, aircraft_id, flight_number, departure_datetime, arrival_datetime, status, base_price) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 DAY), DATE_ADD(DATE_ADD(NOW(), INTERVAL 5 DAY), INTERVAL 2 HOUR), 'scheduled', 200)",
        [r[0].id, a[0].id, testFlightNum]
      );
      const flightId = insFlight.insertId;

      // Crear reserva pagada
      const testPNR = 'CAN' + Math.floor(100 + Math.random() * 899);
      const [insRes] = await pool.query(
        "INSERT INTO reservations (pnr, customer_id, status, estimated_total, paid_total, currency, created_at) VALUES (?, ?, 'paid', 200, 200, 'USD', NOW())",
        [testPNR, c[0].id]
      );
      const resId = insRes.insertId;

      const [insPax] = await pool.query(
        "INSERT INTO passengers (reservation_id, passenger_type, first_names, last_names, document_type, document_number) VALUES (?, 'adult', 'Cancel', 'Pax', '13', '12345678-9')",
        [resId]
      );
      const paxId = insPax.insertId;

      await pool.query(
        "INSERT INTO flight_segments (reservation_id, passenger_id, flight_id, fare_class, seat) VALUES (?, ?, ?, 'economy', '10A')",
        [resId, paxId, flightId]
      );

      // Pago aprobado
      await pool.query(
        "INSERT INTO payments (reservation_id, method, amount, currency, status, type, external_reference, payment_date) VALUES (?, 'cash', 200, 'USD', 'approved', 'payment', 'REF-TEST-CANCEL', NOW())",
        [resId]
      );

      // Intentar cancelar sin confirmar -> debe fallar con 409
      let reqMock = { params: { id: flightId }, body: { confirmar: false } };
      let resMock = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; return this; }
      };

      await vuelosController.cancelarVuelo(reqMock, resMock);
      if (resMock.statusCode === 409 && resMock.data.requiereConfirmacion) {
        console.log('  ✅ Validación de confirmación previa funcionó (HTTP 409 con reservas asociadas).');
      } else {
        console.error('  ❌ Falló validación de confirmación previa: HTTP ' + resMock.statusCode);
        failures++;
      }

      // Cancelar con confirmar = true -> debe cancelar vuelo, cancelar reserva, registrar reembolso
      reqMock = { params: { id: flightId }, body: { confirmar: true, motivo: 'Prueba de auditoría' }, usuario: { id: 1 } };
      resMock = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; return this; }
      };

      await vuelosController.cancelarVuelo(reqMock, resMock);
      if (resMock.statusCode === 200 && resMock.data.exito) {
        console.log('  Vuelo cancelado exitosamente con reservas gestionadas.');

        // Verificar vuelo
        const [fCheck] = await pool.query('SELECT status FROM flights WHERE id = ?', [flightId]);
        // Verificar reserva
        const [rCheck] = await pool.query('SELECT status, cancellation_reason FROM reservations WHERE id = ?', [resId]);
        // Verificar reembolso
        const [pCheck] = await pool.query("SELECT status, type, amount FROM payments WHERE reservation_id = ? AND type = 'refund'", [resId]);

        if (fCheck[0].status === 'cancelled' && rCheck[0].status === 'cancelled' && pCheck.length > 0) {
          console.log('  ✅ TEST 4 PASÓ: Vuelo cancelado, reserva cancelada y reembolso por $' + pCheck[0].amount + ' emitido.');
        } else {
          console.error('  ❌ TEST 4 FALLÓ: Estados no coinciden (vuelo: ' + fCheck[0].status + ', reserva: ' + rCheck[0].status + ', reembolsos: ' + pCheck.length + ')');
          failures++;
        }
      } else {
        console.error('  ❌ TEST 4 FALLÓ al cancelar con confirmar=true: HTTP ' + resMock.statusCode, resMock.data);
        failures++;
      }

      // Limpieza (eliminar primero los reembolsos por la FK original_payment_id)
      await pool.query("DELETE FROM payments WHERE reservation_id = ? AND type = 'refund'", [resId]);
      await pool.query('DELETE FROM payments WHERE reservation_id = ?', [resId]);
      await pool.query('DELETE FROM flight_segments WHERE flight_id = ?', [flightId]);
      await pool.query('DELETE FROM passengers WHERE id = ?', [paxId]);
      await pool.query('DELETE FROM reservations WHERE id = ?', [resId]);
      await pool.query('DELETE FROM flights WHERE id = ?', [flightId]);
    }
  } catch (err) {
    console.error('  ❌ TEST 4 ERROR:', err.message);
    failures++;
  }

  console.log(`\n========================================`);
  console.log(`RESUMEN: ${failures === 0 ? 'TODAS LAS PRUEBAS PASARON ✅' : failures + ' PRUEBAS FALLARON ❌'}`);
  console.log(`========================================`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
})();
