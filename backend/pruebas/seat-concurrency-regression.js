const assert = require('node:assert/strict');
const Module = require('node:module');
let pool;
let nextPnr = 1;
const originalLoad = Module._load;
Module._load = function (name, ...rest) {
  if (name === '../config/db') return pool;
  if (name === '../services/taxService') return { obtenerImpuestos: async () => ({ lines: [] }) };
  if (name === '../utils/pnrGenerator') return { generarPNRUnico: async () => `T${nextPnr++}` };
  return originalLoad.call(this, name, ...rest);
};
const db = { segments: [], nextId: 100, lock: Promise.resolve() };
pool = { getConnection: async () => {
  let unlock, staged = [], updates = [];
  return {
    beginTransaction: async () => {},
    commit: async () => { for (const fn of updates) fn(); db.segments.push(...staged); if (unlock) unlock(); },
    rollback: async () => { staged = []; updates = []; if (unlock) unlock(); },
    release() {},
    query: async (raw, params = []) => {
      const sql = raw.replace(/\s+/g, ' ').trim();
      const all = () => [...db.segments, ...staged];
      const lockFlight = async () => {
        if (unlock) return;
        const previous = db.lock;
        db.lock = new Promise(resolve => { unlock = resolve; });
        await previous;
        if (db.onLock) { db.onLock(); db.onLock = null; }
        // Give a competing request time to contend for the same flight.
        await new Promise(resolve => setTimeout(resolve, 5));
      };
      if (sql.startsWith('SELECT f.flight_number')) {
        assert.ok(sql.endsWith('FOR UPDATE'), 'la venta debe bloquear el vuelo');
        await lockFlight();
        return [[{ flight_number: 'QA1', status: 'scheduled', total_capacity: 6, occupied_seats: all().length, ya_salio: 0 }]];
      }
      if (sql.startsWith('SELECT flight_id FROM flight_segments')) {
        const s = all().find(x => x.id == params[0]); return [s ? [{ flight_id: s.flight_id }] : []];
      }
      if (sql.startsWith('SELECT id FROM flights WHERE id')) { assert.ok(sql.endsWith('FOR UPDATE')); await lockFlight(); return [[{ id: 1 }]]; }
      if (sql.startsWith('SELECT fs.*')) {
        const s = all().find(x => x.id == params[0]); return [s ? [{ ...s, passenger_type: 'adult', birth_date: '1990-01-01', res_status: 'paid', flight_status: 'scheduled', departure_datetime: '2099-01-01T00:00:00Z', total_capacity: 6, pnr: 'EXIST', paid_total: 100, estimated_total: 100 }] : []];
      }
      if (sql.startsWith('SELECT ff.id')) return [[{ id: 10, price: 100, seats_allocated: 6, ocupados_clase: all().length }]];
      if (sql.startsWith('SELECT fs.id')) { assert.ok(sql.endsWith('FOR UPDATE')); return [all().filter(s => s.flight_id == params[0] && String(s.seat || '').toUpperCase() === params[1] && (params.length < 3 || s.id != params[2])).map(s => ({ id: s.id }))]; }
      if (sql.startsWith('SELECT fs.seat')) { assert.ok(sql.endsWith('FOR UPDATE')); return [all().filter(s => s.flight_id == params[0] && s.seat).map(s => ({ seat: s.seat }))]; }
      if (sql.startsWith('SELECT cm.role_operativo')) return [[{ role_operativo: 'pilot' }, { role_operativo: 'copilot' }]];
      if (sql.startsWith('SELECT param_value')) return [[{ param_value: '45' }]];
      if (sql.startsWith('INSERT INTO reservations')) return [{ insertId: db.nextId++ }];
      if (sql.startsWith('INSERT INTO passengers')) return [{ insertId: db.nextId++ }];
      if (sql.startsWith('INSERT INTO flight_segments')) { staged.push({ id: db.nextId++, reservation_id: params[0], passenger_id: params[1], flight_id: params[2], seat: params[4], checkin_status: 'pending' }); return [{ insertId: db.nextId++ }]; }
      if (sql.startsWith('UPDATE flight_segments SET seat')) { const s = all().find(x => x.id == params[1]); updates.push(() => { s.seat = params[0]; }); return [{ affectedRows: 1 }]; }
      if (sql.startsWith("UPDATE flight_segments SET checkin_status = 'checked_in'")) return [{ affectedRows: 1 }];
      throw new Error('Unexpected SQL: ' + sql);
    },
  };
} };
const { crearReserva } = require('../src/controllers/reservasController');
const { asignarAsiento, hacerCheckin } = require('../src/controllers/checkinController');
const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(data) { this.body = data; return this; } });
const reserve = async (seat) => {
  const res = response();
  await crearReserva({ usuario: { id: 1 }, body: { customer_id: 1, vuelos: [{ flight_id: 1, asientos: [seat] }], pasajeros: [{ first_names: 'QA', last_names: 'Test', document_number: '111', birth_date: '1990-01-01', passenger_type: 'adult' }] } }, res);
  return res;
};
const existing = () => ({ id: 500, flight_id: 1, reservation_id: 4, passenger_id: 5, seat: null, checkin_status: 'pending' });
const reset = () => { db.segments = []; db.lock = Promise.resolve(); };
const assertUnique = () => { const seats = db.segments.map(s => s.seat).filter(Boolean); assert.equal(new Set(seats).size, seats.length); };
(async () => {
  reset();
  const pair = await Promise.all([reserve('1A'), reserve('1A')]);
  assert.deepEqual(pair.map(r => r.statusCode).sort(), [201, 409]); assertUnique();
  reset(); db.segments.push(existing());
  const manual = response();
  const [sale] = await Promise.all([reserve('1A'), asignarAsiento({ params: { segmentId: 500 }, body: { seat: '1A' } }, manual)]);
  assert.ok((sale.statusCode === 201 && manual.statusCode === 409) || (sale.statusCode === 409 && manual.statusCode === 200)); assertUnique();
  reset(); db.segments.push(existing());
  const checkin = response();
  const [saleAuto] = await Promise.all([reserve('1A'), hacerCheckin({ params: { segmentId: 500 } }, checkin)]);
  assert.equal(checkin.statusCode, 200); assert.ok([201, 409].includes(saleAuto.statusCode)); assertUnique();
  reset(); db.segments.push(existing());
  const autoFirst = response();
  const locked = new Promise(resolve => { db.onLock = resolve; });
  const firstCheckin = hacerCheckin({ params: { segmentId: 500 } }, autoFirst);
  await locked;
  const [, laterSale] = await Promise.all([firstCheckin, reserve('1A')]);
  assert.equal(autoFirst.statusCode, 200); assert.equal(laterSale.statusCode, 409); assertUnique();
  console.log('PASS | asignaciones simultáneas de asiento por venta y check-in (transacciones simuladas)');
})().catch(error => { console.error(error); process.exitCode = 1; });
