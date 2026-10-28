const assert = require('node:assert/strict');
const express = require('express');
const auth = require('../src/middleware/auth');
const pool = require('../src/config/db');

// Los roles se inyectan aquí para probar las autorizaciones sin una base de datos.
auth.verificarToken = (req, res, next) => { req.usuario = { rol: req.headers['x-test-role'] }; next(); };
const correoPath = require.resolve('../src/controllers/correosController');
const responder = (req, res) => res.json({ exito: true });
require.cache[correoPath] = { id: correoPath, filename: correoPath, loaded: true, exports: {
  listar: responder, obtener: responder, enviarReservaPorCuerpo: responder,
  enviarPagoPorCuerpo: responder, enviarReserva: responder, enviarPago: responder,
  enviarDte: responder, reenviar: responder,
} };
let consultas = [];
pool.query = async (sql) => {
  consultas.push(sql);
  if (sql.includes('fs.boarding_pass_code') && sql.includes('ORDER BY fs.seat')) return [[{ first_names: 'Ana', boarding_pass_code: 'secret' }]];
  if (sql.includes('AS promedio')) return [[{ promedio: 80 }]];
  if (sql.includes('AS cap')) return [[{ cap: 100, ocu: 80 }]];
  if (sql.includes('AS vendidos')) return [[{ code: 'BAG', vendidos: 2, ...(sql.includes(' AS ingresos') ? { ingresos: 20 } : {}) }]];
  if (sql.includes('GROUP BY status')) return [[{ status: 'scheduled', total: 2, c: 2 }]];
  return [[{ total: 1, t: 1, ok: 1, bad: 0, cont: 0 }]];
};

// Las reservas se simulan con datos sensibles para verificar que no se filtren.
const Reserva = require('../src/models/Reserva');
Reserva.listar = async () => [{ id: 1, pnr: 'ABC123', status: 'paid', created_at: '2026-01-01', total_passengers: 1, customer_doc: '123', estimated_total: 100 }];
Reserva.obtenerDetalleCompleto = async () => ({ id: 1, pnr: 'ABC123', status: 'paid', created_at: '2026-01-01', customer_email: 'private@example.test', estimated_total: 100, payments: [{ amount: 100 }], pasajeros: [{ first_names: 'Ana', last_names: 'Perez', passenger_type: 'adult', document_number: '123' }], segmentos: [{ flight_id: 10, flight_number: 'AC1', fare_class: 'Y', seat: '1A', departure_datetime: '2026-01-02', boarding_pass_code: 'secret' }] });

const app = express();
app.use('/correos', require('../src/routes/correosRoutes'));
app.use('/reportes', require('../src/routes/reportesRoutes'));
app.use('/comercial', require('../src/routes/comercialRoutes'));
app.use('/reservas', require('../src/routes/reservasRoutes'));
app.use('/clientes', require('../src/routes/clientesRoutes'));
app.use('/pasajeros', require('../src/routes/pasajerosRoutes'));
app.use('/pagos', require('../src/routes/paymentRoutes'));
app.use('/checkin', require('../src/routes/checkinRoutes'));
const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const pedir = (path, role, method = 'GET') => fetch(base + path, { method, headers: { 'x-test-role': role } });
  try {
    for (const path of ['/correos', '/correos/1', '/reportes/ingresos', '/reportes/conciliacion', '/reportes/dte']) {
      assert.equal((await pedir(path, 'operations')).status, 403, path);
    }
    assert.equal((await pedir('/correos/1/reenviar', 'operations', 'POST')).status, 403);
    assert.equal((await pedir('/correos/confirmacion-reserva', 'operations', 'POST')).status, 403);
    assert.equal((await pedir('/correos/confirmacion-reserva', 'cashier', 'POST')).status, 200);
    for (const [method, path] of [
      ['POST', '/reservas'], ['POST', '/reservas/ABC123/cancelar'],
      ['GET', '/clientes'], ['GET', '/clientes/buscar'], ['POST', '/clientes'], ['PUT', '/clientes/1'],
      ['GET', '/pasajeros/reserva/1'], ['GET', '/pasajeros/documento/DUI/123'], ['PUT', '/pasajeros/1'],
      ['GET', '/pagos/reservas-pendientes'],
      ['GET', '/checkin/pasajeros'], ['GET', '/checkin/reserva/ABC123'], ['GET', '/checkin/mapa/1'],
      ['POST', '/checkin/asiento/1'], ['POST', '/checkin/checkin/1'], ['POST', '/checkin/abordar/1'], ['POST', '/checkin/vuelo/1/cerrar'],
      ['GET', '/comercial/reservas-para-ancillaries'], ['POST', '/comercial/ancillaries/reserva'],
      ['GET', '/comercial/ancillaries/reserva/1'], ['GET', '/comercial/ancillaries/reserva/1/vuelos'],
    ]) assert.equal((await pedir(path, 'operations', method)).status, 403, method + ' ' + path);
    const lista = await (await pedir('/reservas', 'operations')).json();
    assert.deepEqual(Object.keys(lista.datos[0]).sort(), ['id', 'pnr', 'status', 'created_at', 'total_passengers'].sort());
    const detalle = await (await pedir('/reservas/ABC123', 'operations')).json();
    assert.equal(detalle.datos.pasajeros[0].first_names, 'Ana');
    assert.equal(detalle.datos.segmentos[0].flight_number, 'AC1');
    for (const key of ['customer_email', 'estimated_total', 'payments']) assert.equal(key in detalle.datos, false, key);
    assert.equal('document_number' in detalle.datos.pasajeros[0], false);
    assert.equal('boarding_pass_code' in detalle.datos.segmentos[0], false);
    const detalleCajero = await (await pedir('/reservas/ABC123', 'cashier')).json();
    assert.equal(detalleCajero.datos.customer_email, 'private@example.test');
    assert.equal((await pedir('/checkin/vuelos', 'operations')).status, 200);
    const manifiesto = await (await pedir('/checkin/manifiesto/1', 'operations')).json();
    assert.equal(manifiesto.datos[0].first_names, 'Ana');
    assert.equal('boarding_pass_code' in manifiesto.datos[0], false);
    const manifiestoCajero = await (await pedir('/checkin/manifiesto/1', 'cashier')).json();
    assert.equal(manifiestoCajero.datos[0].boarding_pass_code, 'secret');
    assert.equal((await pedir('/correos', 'admin')).status, 200);
    consultas = [];
    const dashboard = await (await pedir('/reportes/dashboard', 'operations')).json();
    assert.deepEqual(Object.keys(dashboard.datos).sort(), ['alertasMantenimiento', 'ocupacionPromedio', 'pax24', 'vuelosHoy'].sort());
    assert.equal(consultas.length, 4);
    consultas = [];
    const kpi = await (await pedir('/comercial/kpi', 'operations')).json();
    assert.deepEqual(Object.keys(kpi.datos).sort(), ['ocupacionHoy', 'pax24h', 'vuelosHoy', 'waitlistActivas'].sort());
    assert.equal(consultas.length, 4);
    const ancillaries = await (await pedir('/comercial/reportes/ancillaries', 'operations')).json();
    assert.equal(ancillaries.datos[0].vendidos, 2);
    assert.equal('ingresos' in ancillaries.datos[0], false);
    const adminAncillaries = await (await pedir('/comercial/reportes/ancillaries', 'admin')).json();
    assert.equal(adminAncillaries.datos[0].ingresos, 20);
    console.log('PASS | permisos operativos de correos y reportes');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
