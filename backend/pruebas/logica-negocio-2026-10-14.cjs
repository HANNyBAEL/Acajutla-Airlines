// Executes real business functions and React handlers with synthetic dependencies.
// No configured database, server, email or external provider is used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
process.env.TZ = 'America/El_Salvador';
process.env.JWT_SECRET = 'isolated-logic-test';
const root = path.resolve(__dirname, '../..');
const results = [];
let query, state, snapshot;
let fixtureErrors = [];
const executeQuery = async (...args) => {
  try { return await query(...args); }
  catch (error) { if (/^Unhandled .*fixture SQL:/.test(error.message)) fixtureErrors.push(error.message); throw error; }
};
const pool = {
  query: executeQuery,
  getConnection: async () => ({ query: executeQuery,
    beginTransaction: async () => { snapshot = structuredClone(state); },
    commit: async () => {},
    rollback: async () => { for (const key of Object.keys(state)) delete state[key]; Object.assign(state, snapshot); },
    release() {} }),
};
const originalLoad = Module._load;
Module._load = function (name) {
  if (/config\/db$/.test(name)) return pool;
  if (name === 'dotenv') return { config: () => ({}) };
  if (/mysql2/.test(name)) throw new Error('Real database forbidden in isolated logic tests');
  if (/config\/brevo$/.test(name)) return { enviarCorreo: async () => { throw new Error('Email forbidden'); } };
  if (name === './mhSimulatorService') return { estaOperativo: async () => true };
  return originalLoad.apply(this, arguments);
};
const Reservations = require('../src/controllers/reservasController');
const Checkin = require('../src/controllers/checkinController');
const Commercial = require('../src/controllers/comercialController');
const Payment = require('../src/services/paymentService');
const Expiration = require('../src/services/expiracionService');
const Dte = require('../src/services/dteService');
const Gateway = require('../src/services/paymentGateway');
const { crearMapaAsientos } = require('../src/utils/asientos');
const { edadEnFecha, tipoPorNacimiento } = require('../src/utils/passengerAge');
const { cancelarServiciosReserva } = require('../src/services/reservationInventoryService');
Gateway.simularLatencia = async () => {};
const response = () => ({ statusCode: 200, body: null, status(n) { this.statusCode = n; return this; }, json(b) { this.body = b; return this; } });
const compact = sql => sql.replace(/\s+/g, ' ').trim();
const future = () => new Date(Date.now() + 86400000).toISOString();
async function test(id, name, fn) {
  fixtureErrors = [];
  try { const evidence = await fn(); assert.equal(fixtureErrors.length, 0, fixtureErrors.join('\n')); results.push({ id, name, passed: true, evidence }); console.log(`PASS ${id} ${name}`); }
  catch (e) { results.push({ id, name, passed: false, evidence: e.message }); console.log(`FAIL ${id} ${name}: ${e.message}`); }
}
function reservationFixture({ price = 100, capacity = 100, tax = 0, quota = 100 } = {}) {
  state = { reservation: null, passengers: [], segments: [], taxes: [], sql: [] };
  const data = state;
  query = async (raw, p = []) => {
    const s = compact(raw); data.sql.push(s);
    if (s.startsWith('SELECT f.flight_number')) return [[{ flight_number: 'QA1', status: 'scheduled', total_capacity: capacity, occupied_seats: data.segments.length, ya_salio: 0 }]];
    if (s.startsWith('SELECT ff.id')) return [[{ id: 1, price, seats_allocated: quota, ocupados_clase: data.segments.length }]];
    if (s.startsWith('SELECT f.id, ao.id')) return [[{ id: 1, airport_id: 1, country_id: 1, country_code: 'SV', trip_type: 'international' }]];
    if (s.includes('FROM tax_rules')) return [tax ? [{ id: 1, code: '59', name: 'QA tax', calculation_type: 'fixed', value: tax }] : []];
    if (s.startsWith('SELECT id FROM reservations WHERE pnr')) return [[]];
    if (s.startsWith('INSERT INTO reservations')) { data.reservation = { id: 7, pnr: p[0], estimated_total: p[3], status: 'pending', paid_total: 0 }; return [{ insertId: 7 }]; }
    if (s.startsWith('INSERT INTO passengers')) { const id = data.passengers.length + 10; data.passengers.push({ id, passenger_type: p[1], first_names: p[2], last_names: p[3] }); return [{ insertId: id }]; }
    if (s.startsWith('SELECT fs.id')) return [data.segments.filter(x => x.flight_id === p[0] && x.seat === p[1])];
    if (s.startsWith('INSERT INTO flight_segments')) { data.segments.push({ reservation_id: p[0], passenger_id: p[1], flight_id: p[2], seat: p[4], total_price: p[7] }); return [{ insertId: data.segments.length }]; }
    if (s.startsWith('INSERT INTO reservation_tax_lines')) { data.taxes.push({ passenger_id: p[1], amount: p[11] }); return [{ insertId: data.taxes.length }]; }
    throw new Error('Unhandled reservation fixture SQL: ' + s);
  };
  return data;
}
const passenger = (type = 'adult', extra = {}) => ({ passenger_type: type, first_names: 'QA', last_names: 'Synthetic', document_type: '13', document_number: '00000000-0', birth_date: `${new Date().getFullYear() - (type === 'infant' ? 1 : type === 'child' ? 6 : 30)}-01-01`, ...extra });
async function createReservation(pax, extra = {}) {
  const res = response();
  await Reservations.crearReserva({ body: { customer_id: 1, vuelos: [{ flight_id: 1, fare_class: 'economy' }], pasajeros: pax, ...extra }, usuario: { id: 1 } }, res);
  return res;
}
function operationalFixture(overrides = {}) {
  state = {
    reservation: { id: 7, pnr: 'QA0001', status: 'paid', estimated_total: 100, paid_total: 100, time_limit: '2099-01-01' },
    segment: { id: 1, flight_id: 2, reservation_id: 7, passenger_type: 'adult', birth_date: '1990-01-01', seat: '1A', checkin_status: 'pending', boarding_pass_code: null, departure_datetime: future(), flight_status: 'scheduled', total_capacity: 90 },
    payment: { id: 8, reservation_id: 7, amount: 100, method: 'cash', currency: 'USD', status: 'approved', type: 'payment' },
    expired: false, stock: 3, ancillaries: [], refund: 0, segmentDeleted: false, occupied: [], sql: [], ...overrides,
  };
  const data = state;
  query = async (raw, p = []) => {
    const s = compact(raw); data.sql.push(s);
    if (s.startsWith('SELECT fs.*')) return [[{ ...data.segment, pnr: data.reservation.pnr, res_status: data.reservation.status, paid_total: data.reservation.paid_total, estimated_total: data.reservation.estimated_total }]];
    if (s.startsWith('SELECT cm.role_operativo')) return [[{ role_operativo: 'pilot' }, { role_operativo: 'copilot' }]];
    if (s.startsWith('SELECT param_value')) return [[{ param_value: '45' }]];
    if (s.startsWith('SELECT fs.id') || s.startsWith('SELECT fs.seat')) return [data.occupied];
    if (s.startsWith('SELECT checkin_status')) return [[{ checkin_status: data.segment.checkin_status }]];
    if (s.startsWith('UPDATE flight_segments SET seat')) { data.segment.seat = p[0]; return [{ affectedRows: 1 }]; }
    if (s.startsWith('UPDATE flight_segments SET checkin_status')) {
      if (s.includes("SET checkin_status = 'pending'")) { if (data.segment.checkin_status === 'checked_in') { data.segment.checkin_status = 'pending'; data.segment.boarding_pass_code = null; } }
      else { data.segment.checkin_status = s.includes("'boarded'") ? 'boarded' : 'checked_in'; if (s.includes('boarding_pass_code')) data.segment.boarding_pass_code = p[0]; }
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith('SELECT reservation_id FROM payments')) return [[{ reservation_id: 7 }]];
    if (s.startsWith('SELECT * FROM reservations')) return [[{ ...data.reservation }]];
    if (s.startsWith('SELECT * FROM payments')) return [[{ ...data.payment }]];
    if (s.startsWith('SELECT time_limit')) return [[{ vencida: data.expired ? 1 : 0 }]];
    if (s.startsWith('SELECT COALESCE(SUM(amount)')) return [[{ amount: s.includes('original_payment_id') ? data.refund : 0 }]];
    if (s.startsWith('INSERT INTO payments')) { if (s.includes("'refunded'")) data.refund += p[3]; return [{ insertId: 9 }]; }
    if (s.startsWith('UPDATE reservations SET paid_total')) { data.reservation.paid_total = p[0]; if (s.includes('status = ?')) data.reservation.status = p[1]; return [{ affectedRows: 1 }]; }
    if (s.startsWith('SELECT id, pnr FROM reservations')) return [data.expired && (data.reservation.status === 'pending' || (s.includes("status = 'confirmed'") && data.reservation.status === 'confirmed' && data.reservation.paid_total < data.reservation.estimated_total)) ? [{ id: 7, pnr: 'QA0001' }] : []];
    if (s.startsWith('SELECT id, status FROM reservations')) return [[{ id: 7, status: data.reservation.status }]];
    if (s.startsWith('UPDATE reservations SET status')) { data.reservation.status = s.includes("'expired'") ? 'expired' : 'cancelled'; return [{ affectedRows: 1 }]; }
    if (s.startsWith('DELETE FROM flight_segments')) { data.segmentDeleted = true; return [{ affectedRows: 1 }]; }
    if (s.startsWith('UPDATE payments')) return [{ affectedRows: 0 }];
    if (s.startsWith('SELECT id FROM flight_segments')) return [s.includes("checkin_status = 'boarded'") ? (data.segment.checkin_status === 'boarded' ? [{ id: 1 }] : []) : [{ id: 1 }]];
    if (s.startsWith('SELECT id, flight_id, ancillary_id FROM reservation_ancillaries')) return [data.ancillaries.filter(x => x.status === 'active')];
    if (s.startsWith('UPDATE flight_ancillaries SET stock = stock +')) { if (data.inventoryFailure) throw new Error('Synthetic inventory failure'); data.stock += p[0]; return [{ affectedRows: 1 }]; }
    if (s.startsWith("UPDATE reservation_ancillaries SET status = 'cancelled'")) { data.ancillaries.forEach(x => { if (x.status === 'active') x.status = 'cancelled'; }); return [{ affectedRows: 1 }]; }
    if (s.startsWith('SELECT id FROM dte_headers')) return [[]];
    if (s.startsWith('SELECT * FROM flight_ancillaries')) return [[{ id: 1, stock: data.stock, price_override: null }]];
    if (s.startsWith('SELECT base_price')) return [[{ base_price: 20 }]];
    if (s.startsWith('INSERT INTO reservation_ancillaries')) { data.ancillaries.push({ id: data.ancillaries.length + 1, flight_id: p[2], ancillary_id: p[3], price: p[4], status: 'active' }); return [{ insertId: data.ancillaries.length }]; }
    if (s.startsWith('UPDATE flight_ancillaries SET stock = stock -')) { data.stock -= p[0]; return [{ affectedRows: 1 }]; }
    if (s.startsWith('UPDATE reservations SET estimated_total')) { data.reservation.estimated_total += p[0]; return [{ affectedRows: 1 }]; }
    throw new Error('Unhandled operational fixture SQL: ' + s);
  };
  return data;
}
async function controller(fn, body = {}, params = { segmentId: 1 }) {
  const res = response(); await fn({ body, params, usuario: { id: 1 } }, res); return res;
}
function dteFixture(data) {
  state = data; data.reservation.status = 'paid'; data.reservation.paid_total = data.reservation.estimated_total;
  query = async (raw, p = []) => {
    const s = compact(raw);
    if (s.includes('GET_LOCK')) return [[{ acquired: 1 }]];
    if (s.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
    if (s.includes('FROM reservations r LEFT JOIN customers')) return [[{ ...data.reservation, c_first: 'QA', c_last: 'Synthetic', c_doctype: 'DUI', c_docnum: '00000000-0' }]];
    if (s.startsWith('SELECT * FROM passengers')) return [data.passengers];
    if (s.startsWith('SELECT DISTINCT f.flight_number')) return [[{ flight_number: 'QA1', departure_datetime: future() }]];
    if (s.startsWith('SELECT * FROM payments')) return [[{ id: 8, method: 'cash', amount: data.reservation.estimated_total }]];
    if (s.includes('original_payment_id')) return [[]];
    if (s.includes('FROM reservation_tax_lines')) return [data.taxes];
    if (s.includes('FROM flight_segments WHERE reservation_id')) return [data.passengers.map(pax => ({ passenger_id: pax.id, base: data.segments.filter(x => x.passenger_id === pax.id).reduce((a, x) => a + x.total_price, 0) }))];
    if (s.includes('FROM reservation_ancillaries')) return [[]];
    if (s.includes('MAX(CAST(RIGHT(control_number')) return [[{ n: 1 }]];
    if (s.startsWith('SELECT id, status FROM reservations')) return [[{ id: 7, status: 'paid' }]];
    if (s.startsWith('SELECT uuid_generation')) return [[]];
    if (s.startsWith('INSERT INTO dte_headers')) return [{ insertId: 1 }];
    if (s.startsWith('INSERT INTO dte_items') || s.startsWith('UPDATE dte_headers')) return [{ affectedRows: 1 }];
    throw new Error('Unhandled DTE fixture SQL: ' + s);
  };
}

// Load the real frontend source without a browser. Hooks are stateful doubles;
// JSX elements and their event handlers come from the actual components.
const frontendRequire = Module.createRequire(path.join(root, 'frontend-backoffice/package.json'));
const esbuild = frontendRequire('esbuild');
const React = frontendRequire('react');
function loadFrontend(relative, mocks, globals = {}) {
  const file = path.join(root, 'frontend-backoffice/src', relative);
  const code = esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader: file.endsWith('jsx') ? 'jsx' : 'js', format: 'cjs', jsx: 'automatic', define: { 'import.meta.env.VITE_API_URL': '""' } }).code;
  const mod = { exports: {} };
  const context = { module: mod, exports: mod.exports, console, Date, Promise, ...globals,
    require: name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === 'react/jsx-runtime') return frontendRequire(name);
      if (name.startsWith('react-icons/')) return new Proxy({}, { get: () => () => null });
      if (name.includes('/components/')) return { default: () => null, __esModule: true };
      throw new Error('Unmocked frontend dependency: ' + name);
    } };
  vm.runInNewContext(code, context, { filename: file });
  return mod.exports;
}
function componentFixture(file, values = {}, api = {}) {
  const slots = []; let cursor = 0;
  const hooks = { ...React, useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = Object.hasOwn(values, i) ? values[i] : typeof initial === 'function' ? initial() : initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; }, useEffect() {}, useMemo: fn => fn() };
  const Component = loadFrontend(file, { react: hooks, '../services/api': { __esModule: true, default: api, checkinAPI: api }, 'react-hot-toast': { __esModule: true, default: { success() {}, error() {} } }, '../utils/confirm': {}, '../utils/fechaServidor': { fechaActualSV: () => '2026-10-14' } }).default;
  return { slots, render: () => { cursor = 0; return Component(); } };
}
function elements(node, predicate, out = []) {
  if (Array.isArray(node)) node.forEach(n => elements(n, predicate, out));
  else if (node && typeof node === 'object' && node.props) { if (predicate(node)) out.push(node); elements(node.props.children, predicate, out); }
  return out;
}
function apiFixture(retryStatus = null, refreshFails = false) {
  const store = new Map([['bo_token', 'old-access'], ['bo_refresh', 'valid-refresh']]);
  let rejectHandler, refreshes = 0;
  const api = { interceptors: { request: { use() {} }, response: { use(ok, fail) { rejectHandler = fail; } } },
    post: async () => { refreshes++; if (refreshFails) throw { response: { status: 401 } }; return { data: { datos: { accessToken: 'new-access', refreshToken: 'new-refresh' } } }; },
    request: async () => { if (retryStatus) throw { response: { status: retryStatus } }; return { data: 'ok' }; } };
  const window = { location: { href: '/pagos' } };
  loadFrontend('services/api.js', { axios: { create: () => api } }, { window, sessionStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) } });
  return { store, window, get refreshes() { return refreshes; }, fail: url => rejectHandler({ response: { status: 401 }, config: { url, headers: {} } }) };
}

(async () => {
  for (const [price, type, count] of [[100,'adult',2],[10.10,'child',1],[10.10,'child',2],[10.10,'child',3],[99.99,'child',2],[10.05,'infant',2],[0.01,'infant',5],[100,'child',2]]) {
    await test(`ROUND-${price}-${type}-${count}`, 'El total coincide con la suma de importes guardados', async () => {
      const data = reservationFixture({ price }); const res = await createReservation(Array.from({ length: count }, () => passenger(type)));
      assert.equal(res.statusCode, 201, JSON.stringify(res.body));
      const lines = Math.round(data.segments.reduce((s, x) => s + x.total_price, 0) * 100);
      assert.equal(Math.round(data.reservation.estimated_total * 100), lines, `Total reserva=${data.reservation.estimated_total}; suma segmentos=${lines / 100}`);
    });
  }
  for (const price of [100, 10.10]) await test(`DTE-${price}`, 'Una reserva recien creada y pagada puede facturarse', async () => {
    const data = reservationFixture({ price }); const res = await createReservation([passenger('child'),passenger('child')]);
    assert.equal(res.statusCode, 201); dteFixture(data);
    const result = await Dte.emitirDTE({ reservation_id: 7, tipo_dte: '01' }); assert.equal(result.estado, 'accepted');
  });
  for (const [id, extra] of [['sin-cliente',{ customer_id: null }],['sin-vuelos',{ vuelos: [] }],['sin-pasajeros',{ pasajeros: [] }]]) await test('RES-' + id, 'Se rechaza una reserva incompleta', async () => {
    reservationFixture(); const res = await createReservation([passenger()], extra); assert.equal(res.statusCode, 400);
  });
  await test('RES-CAPACIDAD', 'No se vende por encima de capacidad', async () => {
    reservationFixture({ capacity: 1 }); assert.equal((await createReservation([passenger(),passenger()])).statusCode, 409);
  });
  await test('RES-ID', 'El ID enviado por el cliente no sustituye el pasajero creado', async () => {
    const data = reservationFixture(); assert.equal((await createReservation([passenger('adult',{ id: 999 })])).statusCode, 201);
    assert.equal(data.segments[0].passenger_id, data.passengers[0].id, `Pasajero creado=${data.passengers[0].id}; segmento asociado=${data.segments[0].passenger_id}`);
  });
  await test('RES-EDAD', 'Un adulto no obtiene tarifa infantil por declarar infant', async () => {
    const data = reservationFixture(); const res = await createReservation([passenger('infant', { birth_date: '1990-01-01' })]);
    assert.ok(res.statusCode >= 400 || data.reservation.estimated_total === 100, `Adulto de 1990 aceptado HTTP ${res.statusCode} por $${data.reservation?.estimated_total}`);
  });
  for (const partial of [0, 1]) await test('EXP-' + partial, 'Una reserva vencida sin liquidar libera sus asientos', async () => {
    const data = operationalFixture(); Object.assign(data.reservation, { status: 'pending', paid_total: 0 });
    if (partial) {
      const payment = await Payment.procesarPago({ reservation_id: 7, method: 'cash', amount: 1 }, { id: 1 });
      assert.equal(payment.reservation_status, 'confirmed');
    }
    data.expired = true;
    if (partial) await assert.rejects(() => Payment.procesarPago({ reservation_id: 7, method: 'cash', amount: 99 }, { id: 1 }), /venci/i);
    await Expiration.expirarReservas();
    assert.ok(data.segmentDeleted, `Estado=${data.reservation.status}; pagado=${data.reservation.paid_total}; vencida=true; asiento retenido`);
    assert.equal(data.reservation.paid_total, partial, 'La expiracion conserva el abono pendiente de reembolso');
  });
  for (const action of ['cancelar','expirar']) await test('STOCK-' + action, 'Cancelar o expirar devuelve servicios no consumidos al inventario', async () => {
    const data = operationalFixture(); Object.assign(data.reservation, { status: 'pending', paid_total: 0 });
    const added = await controller(Commercial.agregarAncillaryReserva, { reservation_id: 7, flight_id: 2, passenger_id: 1, ancillary_id: 1, quantity: 2 });
    assert.equal(added.statusCode, 201); assert.equal(data.stock, 1);
    if (action === 'cancelar') assert.equal((await controller(Reservations.cancelarReserva, {}, { pnr: 'QA0001' })).statusCode, 200);
    else { data.expired = true; await Expiration.expirarReservas(); }
    assert.equal(data.stock, 3, `Reserva=${data.reservation.status}; stock=${data.stock} en vez de 3; servicios activos=${data.ancillaries.filter(x => x.status === 'active').length}`);
    assert.ok(data.ancillaries.every(x => x.status === 'cancelled'));
  });
  await test('STOCK-LIMITE', 'No se vende mas stock del disponible', async () => {
    const data = operationalFixture(); Object.assign(data.reservation, { status: 'pending', paid_total: 0 });
    assert.equal((await controller(Commercial.agregarAncillaryReserva, { reservation_id: 7, flight_id: 2, ancillary_id: 1, quantity: 4 })).statusCode, 409); assert.equal(data.stock, 3);
  });
  await test('CHECKIN-PAGADO', 'Reserva pagada con tripulacion valida hace check-in', async () => {
    const data = operationalFixture(); assert.equal((await controller(Checkin.hacerCheckin)).statusCode, 200); assert.equal(data.segment.checkin_status, 'checked_in');
  });
  await test('CHECKIN-SALDO', 'Un saldo pendiente bloquea check-in', async () => {
    const data = operationalFixture(); data.reservation.paid_total = 99; assert.equal((await controller(Checkin.hacerCheckin)).statusCode, 400);
  });
  for (const seat of ['99F','12A']) await test('CHECKIN-ASIENTO-' + seat, 'Check-in revalida un asiento previo invalido o de emergencia para menor', async () => {
    const data = operationalFixture(); Object.assign(data.segment, { seat, passenger_type: 'child', birth_date: '2018-01-01' });
    const res = await controller(Checkin.hacerCheckin); assert.ok(res.statusCode >= 400, `Menor con asiento ${seat} obtuvo HTTP ${res.statusCode} y pase ${data.segment.boarding_pass_code}`);
  });
  await test('ASIENTO-CAPACIDAD', 'Asignacion explicita rechaza un asiento inexistente', async () => {
    operationalFixture(); assert.equal((await controller(Checkin.asignarAsiento, { seat: '99F' })).statusCode, 400);
  });
  await test('ASIENTO-PASE', 'Cambiar asiento despues de check-in conserva un pase coherente', async () => {
    const data = operationalFixture(); assert.equal((await controller(Checkin.hacerCheckin)).statusCode, 200);
    const res = await controller(Checkin.asignarAsiento, { seat: '2B' });
    assert.ok(res.statusCode >= 400 || data.segment.boarding_pass_code.endsWith('-2B'), `HTTP ${res.statusCode}; asiento=${data.segment.seat}; pase=${data.segment.boarding_pass_code}`);
  });
  await test('EMBARQUE-REEMBOLSO', 'Reembolso total despues de check-in impide embarcar sin pago', async () => {
    const data = operationalFixture(); assert.equal((await controller(Checkin.hacerCheckin)).statusCode, 200);
    await Payment.reembolsar(8, 100, 'QA cancellation', { id: 1 });
    const res = await controller(Checkin.abordar);
    assert.ok(res.statusCode >= 400, `Pagado=${data.reservation.paid_total}; reserva=${data.reservation.status}; embarque HTTP ${res.statusCode}; pasajero=${data.segment.checkin_status}`);
  });
  for (const status of ['cancelled','completed']) await test('EMBARQUE-VUELO-' + status, 'El estado terminal del vuelo impide embarcar', async () => {
    const data = operationalFixture(); Object.assign(data.segment, { checkin_status: 'checked_in', flight_status: status });
    const res = await controller(Checkin.abordar); assert.ok(res.statusCode >= 400, `Vuelo=${status}; embarque HTTP ${res.statusCode}`);
  });
  await test('EMBARQUE-SIN-CHECKIN', 'No se embarca sin check-in previo', async () => { operationalFixture(); assert.equal((await controller(Checkin.abordar)).statusCode, 400); });
  for (const capacity of [2, 6, 74]) await test('UI-MAPA-' + capacity, 'El mapa solo habilita asientos fisicos existentes', async () => {
    const map = { ...crearMapaAsientos(capacity), ocupados: [] };
    const fixture = componentFixture('pages/Checkin.jsx', { 8: map, 9: { segment_id: 1, flight_number: 'QA1' } });
    const invalid = elements(fixture.render(), el => el.type === 'button' && typeof el.props.children === 'string' && /^\d+[A-F]$/.test(el.props.children) && !el.props.disabled && !map.asientos.includes(el.props.children)).map(el => el.props.children);
    assert.equal(invalid.length, 0, 'Asientos inexistentes habilitados: ' + invalid.join(', '));
  });
  await test('UI-OTRA-RESERVA', 'Crear otra reserva exige seleccionar nuevamente el cliente', async () => {
    const sent = [];
    const api = { post: async (url, body) => { sent.push({ url, body }); return { data: { datos: { pnr: 'QA0002', reservation_id: 8 } } }; } };
    const fixture = componentFixture('pages/NuevaReserva.jsx', { 1: 77, 2: { id: 77 }, 12: 'QA0001' }, api);
    const buttons = elements(fixture.render(), el => el.type === 'button' && el.props.children === 'Crear otra reserva');
    assert.equal(buttons.length, 1); buttons[0].props.onClick();
    // Fill only itinerary/passenger slots after reset, leaving the customer empty.
    fixture.slots[8] = [{ origen: 'SAL', destino: 'MIA', fecha: '2099-01-01', vueloId: 1, vuelos: [{ id: 1, flight_number: 'QA1', available_seats: 10, total_price: 100 }] }];
    fixture.slots[9] = [passenger()];
    const save = elements(fixture.render(), el => el.type === 'button' && el.props.className === 'btn-primary w-full mt-6');
    assert.equal(save.length, 1); await save[0].props.onClick();
    const request = sent.find(x => x.url === '/reservas');
    assert.ok(!request, `Cliente visible=${JSON.stringify(fixture.slots[2])}; POST /reservas envio customer_id=${request?.body.customer_id}`);
  });
  await test('UI-REFRESH-OK', 'El vencimiento en pagos renueva y reintenta', async () => {
    const api = apiFixture(); await api.fail('/pagos'); assert.equal(api.refreshes, 1); assert.equal(api.store.get('bo_token'), 'new-access');
  });
  await test('UI-REFRESH-PERFIL', 'La carga del perfil tambien renueva una sesion vencida', async () => {
    const api = apiFixture(); await api.fail('/auth/perfil').catch(() => {}); assert.equal(api.refreshes, 1, '401 en /auth/perfil no intenta renovar con refresh token valido');
  });
  for (const status of [400,403,500]) await test('UI-REFRESH-RETRY-' + status, 'Un error del negocio tras renovar no elimina la sesion valida', async () => {
    const api = apiFixture(status); const error = await api.fail('/pagos').catch(e => e);
    assert.equal(api.store.get('bo_token'), 'new-access', `Reintento HTTP ${status}; token=${api.store.get('bo_token')}; destino=${api.window.location.href}`);
    assert.equal(error.response.status, status, 'Se conserva el error original de la operacion');
  });
  await test('EDAD-LIMITES', 'Edad civil valida cumpleaños de 2 y 12 años, fechas futuras e inexistentes', async () => {
    assert.equal(tipoPorNacimiento('2024-10-14','2026-10-13'), 'infant');
    assert.equal(tipoPorNacimiento('2024-10-14','2026-10-14'), 'child');
    assert.equal(tipoPorNacimiento('2014-10-14','2026-10-13'), 'child');
    assert.equal(tipoPorNacimiento('2014-10-14','2026-10-14'), 'adult');
    assert.equal(edadEnFecha('2025-02-29','2026-10-14'), null);
    assert.equal(edadEnFecha('2028-01-01','2026-10-14'), null);
  });
  await test('RES-EMERGENCIA', 'No se crea una reserva infantil en salida de emergencia', async () => {
    reservationFixture(); const res = await createReservation([passenger('child')], { vuelos: [{ flight_id: 1, seat: '12A' }] }); assert.equal(res.statusCode, 400);
  });
  await test('EMBARQUE-VALIDO', 'Un pasajero pagado con check-in valido puede abordar', async () => {
    const data = operationalFixture(); assert.equal((await controller(Checkin.hacerCheckin)).statusCode, 200);
    assert.equal((await controller(Checkin.abordar)).statusCode, 200); assert.equal(data.segment.checkin_status, 'boarded');
    await assert.rejects(() => Payment.reembolsar(8, 100, 'QA', { id: 1 }), /embarcad/); assert.equal(data.reservation.paid_total, 100); assert.equal(data.refund, 0);
  });
  await test('ASIENTO-PENDIENTE', 'El asiento se puede cambiar antes del check-in', async () => {
    const data = operationalFixture(); assert.equal((await controller(Checkin.asignarAsiento, { seat: '2B' })).statusCode, 200); assert.equal(data.segment.seat, '2B');
  });
  await test('STOCK-IDEMPOTENTE', 'Devolver inventario dos veces no duplica stock', async () => {
    const data = operationalFixture({ stock: 1, ancillaries: [{ id: 1, flight_id: 2, ancillary_id: 1, status: 'active' }, { id: 2, flight_id: 2, ancillary_id: 1, status: 'active' }] });
    const conn = await pool.getConnection(); await conn.beginTransaction();
    await cancelarServiciosReserva(7,conn); await cancelarServiciosReserva(7,conn); await conn.commit();
    assert.equal(data.stock, 3); assert.ok(data.ancillaries.every(x => x.status === 'cancelled'));
  });
  await test('STOCK-ROLLBACK', 'Un fallo de stock revierte la cancelacion completa', async () => {
    const data = operationalFixture({ inventoryFailure: true, stock: 1, ancillaries: [{ id: 1, flight_id: 2, ancillary_id: 1, status: 'active' }] });
    const originalError = console.error; const logged = [];
    let res;
    try { console.error = (...args) => logged.push(args.map(String).join(' ')); res = await controller(Reservations.cancelarReserva, {}, { pnr: 'QA0001' }); }
    finally { console.error = originalError; }
    assert.ok(logged.some(line => line.includes('Synthetic inventory failure')));
    assert.equal(res.statusCode, 500); assert.equal(data.reservation.status, 'paid'); assert.equal(data.segmentDeleted, false); assert.equal(data.stock, 1); assert.equal(data.ancillaries[0].status, 'active');
  });
  await test('UI-IMPUESTOS', 'El total mostrado coincide con base y tributos redondeados del backend', async () => {
    const data = reservationFixture({ price: 10.10, tax: 0.03 }); const passengers = [passenger('child'),passenger('child')];
    assert.equal((await createReservation(passengers)).statusCode, 201);
    const sum = data.segments.reduce((s,x) => s + Math.round(x.total_price * 100),0) + data.taxes.reduce((s,x) => s + Math.round(x.amount * 100),0);
    assert.equal(Math.round(data.reservation.estimated_total * 100),sum);
    const fixture = componentFixture('pages/NuevaReserva.jsx', { 8: [{ vueloId: 1, vuelos: [{ id: 1, available_seats: 100, fare_price: 10.10, taxes: [{ amount: 0.03 }], total_price: 10.13 }] }], 9: passengers });
    const total = elements(fixture.render(), el => el.type === 'span' && el.props.className === 'font-bold text-primary-700');
    assert.equal(total.length, 1); assert.equal(total[0].props.children.join(''), '$' + data.reservation.estimated_total.toFixed(2));
  });
  await test('UI-EDAD-CUMPLEANOS', 'La interfaz conserva tarifa infantil hasta el cumpleaños civil en El Salvador', async () => {
    const fixture = componentFixture('pages/NuevaReserva.jsx', { 9: [passenger('child', { birth_date: '2014-10-15' })] });
    const input = elements(fixture.render(), el => el.type === 'input' && el.props.type === 'date' && el.props.value === '2014-10-15');
    assert.equal(input.length, 1); input[0].props.onChange({ target: { value: '2014-10-15' } });
    assert.equal(fixture.slots[9][0].passenger_type, 'child');
    input[0].props.onChange({ target: { value: '2014-10-14' } }); assert.equal(fixture.slots[9][0].passenger_type, 'adult');
  });
  await test('UI-REFRESH-FALLIDO', 'Un refresh revocado limpia la sesion', async () => {
    const api = apiFixture(null,true); await api.fail('/pagos').catch(() => {}); assert.equal(api.store.has('bo_token'), false); assert.equal(api.window.location.href, '/login');
  });
  await test('UI-REFRESH-CONCURRENTE', 'Dos respuestas 401 comparten una renovacion', async () => {
    const api = apiFixture(); await Promise.all([api.fail('/pagos'),api.fail('/auth/perfil')]); assert.equal(api.refreshes, 1);
  });
  await test('UI-LOGIN-401', 'Una clave de acceso incorrecta no dispara refresh', async () => {
    const api = apiFixture(); await api.fail('/auth/login').catch(() => {}); assert.equal(api.refreshes, 0);
  });
  const report = { date: '2026-10-14', scope: ['backend', 'frontend-backoffice'], mode: 'real functions and JSX handlers; in-memory SQL fixtures and HTTP doubles; no live SQL or browser', total: results.length, passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length, results };
  const output = path.join(root, 'backend/docs/qa-logica-2026-10-14'); fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'resultados.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`RESULTADO ${report.passed}/${report.total} PASS; ${report.failed} FAIL`);
  if (report.failed) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 2; }).finally(() => { Module._load = originalLoad; });
