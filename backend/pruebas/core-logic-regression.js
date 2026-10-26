// Isolated regression coverage for fiscal identity, payment ledger invariants,
// duplicate DTE prevention and repeated partial returns. Never opens a DB socket.
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;

const noDbPool = {
  async query() { throw new Error('Unexpected direct DB query in isolated regression'); },
  async getConnection() { throw new Error('Unexpected DB connection in isolated regression'); },
  on() {}
};

const paymentState = { reservation: null, payments: [], nextId: 1, reservationExpired: false };
const paymentPool = {
  async getConnection() {
    const snapshot = JSON.parse(JSON.stringify(paymentState));
    return {
      async beginTransaction() {},
      async commit() {},
      async rollback() { Object.assign(paymentState, snapshot); },
      release() {},
      async query(sql, params = []) {
        if (sql.startsWith("SELECT id FROM flight_segments WHERE reservation_id = ? AND checkin_status = 'boarded'")) return [[]];
        if (sql.startsWith("UPDATE flight_segments SET checkin_status = 'pending'")) return [{ affectedRows: 0 }];
        if (sql.startsWith('SELECT * FROM reservations WHERE id = ? FOR UPDATE')) {
          return [paymentState.reservation?.id === Number(params[0]) ? [{ ...paymentState.reservation }] : []];
        }
        if (sql.startsWith('SELECT time_limit < NOW() AS vencida FROM reservations WHERE id = ?')) {
          return [[{ vencida: paymentState.reservationExpired ? 1 : 0 }]];
        }
        if (sql.startsWith("SELECT COALESCE(SUM(amount), 0) AS amount FROM payments WHERE reservation_id")) {
          const amount = paymentState.payments.filter((p) => p.reservation_id === Number(params[0]) && p.type === 'payment' && p.status === 'pending_confirmation' && p.method === 'transfer' && p.external_reference != null).reduce((sum, p) => sum + p.amount, 0);
          return [[{ amount }]];
        }
        if (sql.startsWith('INSERT INTO payments (reservation_id, method, amount')) {
          const row = { id: paymentState.nextId++, reservation_id: Number(params[0]), method: params[1], amount: Number(params[2]), currency: params[3], status: params[4], type: 'payment', external_reference: params[5], requiere_deduccion_fiscal: Number(params[12] || 0), receptor_dte: params[13] ? JSON.parse(params[13]) : null };
          paymentState.payments.push(row);
          return [{ insertId: row.id }];
        }
        if (sql.startsWith('SELECT reservation_id FROM payments WHERE id = ? AND status = ? AND type = ?')) {
          const p = paymentState.payments.find((x) => x.id === Number(params[0]) && x.status === params[1] && x.type === params[2] && (!sql.includes("AND method = 'transfer'") || x.method === 'transfer') && (!sql.includes('external_reference IS NOT NULL') || x.external_reference != null));
          return [p ? [{ reservation_id: p.reservation_id }] : []];
        }
        if (sql.startsWith('SELECT * FROM payments WHERE id = ? AND status = ? AND type = ?')) {
          const p = paymentState.payments.find((x) => x.id === Number(params[0]) && x.status === params[1] && x.type === params[2] && (!sql.includes("AND method = 'transfer'") || x.method === 'transfer') && (!sql.includes('external_reference IS NOT NULL') || x.external_reference != null));
          return [p ? [{ ...p }] : []];
        }
        if (sql.startsWith("SELECT COALESCE(SUM(amount), 0) AS amount FROM payments WHERE original_payment_id")) {
          const amount = paymentState.payments.filter((p) => p.original_payment_id === Number(params[0]) && p.type === 'refund' && p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0);
          return [[{ amount }]];
        }
        if (sql.startsWith('UPDATE payments SET status = ?, confirmed_by')) {
          const p = paymentState.payments.find((x) => x.id === Number(params[2]));
          p.status = params[0];
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE reservations SET paid_total = ? WHERE id = ?')) {
          paymentState.reservation.paid_total = Number(params[0]);
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE reservations SET paid_total')) {
          paymentState.reservation.paid_total = Number(params[0]);
          paymentState.reservation.status = params[1];
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE reservations SET paid_total = ?, status = ?, time_limit')) {
          paymentState.reservation.paid_total = Number(params[0]);
          paymentState.reservation.status = params[1];
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE reservations SET paid_total = ?, status = ?')) {
          paymentState.reservation.paid_total = Number(params[0]);
          paymentState.reservation.status = params[1];
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('INSERT INTO payments (reservation_id, original_payment_id')) {
          const row = { id: paymentState.nextId++, reservation_id: Number(params[0]), original_payment_id: Number(params[1]), amount: Number(params[3]), currency: params[4], status: 'refunded', type: 'refund' };
          paymentState.payments.push(row);
          return [{ insertId: row.id }];
        }
        throw new Error(`Unexpected payment SQL: ${sql}`);
      }
    };
  }
};

const gateway = {
  refundCalls: 0,
  async procesarTransferencia(datos) { return { exito: true, codigo: 'PENDING_CONFIRMATION', mensaje: 'Pendiente', referencia: datos.referencia }; },
  async procesarEfectivo() { return { exito: true, codigo: 'APPROVED', mensaje: 'Aprobado' }; },
  async procesarTarjeta() { return { exito: true, codigo: 'APPROVED', mensaje: 'Aprobado' }; },
  async procesarPayPal() { return { exito: true, codigo: 'APPROVED', mensaje: 'Aprobado', transaction_id: 'PP-TEST-1' }; },
  async reembolsar() { this.refundCalls++; return { exito: true, codigo: 'REFUND_APPROVED', refund_id: 'RF-TEST' }; }
};

const returnState = { docs: [], events: [], nextId: 1, rollbacks: 0 };
const returnPool = {
  async getConnection() {
    const snapshot = JSON.parse(JSON.stringify(returnState));
    return {
      async beginTransaction() {},
      async commit() {},
      async rollback() { Object.assign(returnState, snapshot); returnState.rollbacks++; },
      release() {},
      async query(sql, params = []) {
        if (sql.startsWith('SELECT * FROM dte_headers WHERE uuid_generation IN (?)')) {
          const uuids = params[0];
          return [returnState.docs.filter((d) => uuids.includes(d.uuid_generation)).sort((a, b) => a.id - b.id).map((d) => ({ ...d }))];
        }
        if (sql.startsWith('SELECT returned_amount FROM dte_return_events WHERE dte_id = ? FOR UPDATE')) {
          return [returnState.events.filter((e) => e.dte_id === Number(params[0])).map((e) => ({ returned_amount: e.returned_amount }))];
        }
        if (sql.startsWith("SELECT dte_uuids, full_json FROM fiscal_events")) return [[]];
        if (sql.startsWith('INSERT INTO dte_return_events')) {
          const row = { id: returnState.nextId++, uuid: params[0], dte_id: Number(params[1]), returned_amount: Number(params[7]), full_json: params[8] };
          returnState.events.push(row);
          return [{ insertId: row.id }];
        }
        throw new Error(`Unexpected return SQL: ${sql}`);
      }
    };
  }
};

const cancellationState = { refundAmount: 0, reservationStatus: 'confirmed', pendingTransferStatus: 'pending_confirmation' };
const cancellationPool = {
  async getConnection() {
    return {
      async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
      async query(sql, params = []) {
        if (sql.startsWith('SELECT id, flight_number, status, departure_datetime FROM flights')) {
          return [[{ id: 41, flight_number: 'TEST41', status: 'scheduled', departure_datetime: new Date(Date.now() + 86400000).toISOString() }]];
        }
        if (sql.startsWith('SELECT CAST(?) AS DATETIME') || sql.startsWith('SELECT CAST(? AS DATETIME)')) {
          return [[{ pasada: 0 }]];
        }
        if (sql.startsWith('SELECT DISTINCT r.id, r.pnr, r.status, r.paid_total, r.customer_id')) {
          return [[{ id: 91, pnr: 'TST091', status: 'confirmed', paid_total: 70, customer_id: 1 }]];
        }
        if (sql.startsWith('SELECT id, amount, currency, external_reference FROM payments')) {
          return [[{ id: 51, amount: 100, currency: 'USD', external_reference: 'PAY-51' }]];
        }
        if (sql.startsWith("SELECT COALESCE(SUM(amount), 0) AS amount FROM payments WHERE original_payment_id")) {
          return [[{ amount: 30 }]];
        }
        if (sql.startsWith('INSERT INTO payments (reservation_id, original_payment_id')) {
          cancellationState.refundAmount += Number(params[2]);
          return [{ insertId: 70 }];
        }
        if (sql.startsWith("UPDATE reservations SET status = 'cancelled'")) {
          cancellationState.reservationStatus = 'cancelled';
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("UPDATE payments SET status = 'cancelled' WHERE reservation_id = ?")) {
          cancellationState.pendingTransferStatus = 'cancelled';
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE reservations SET paid_total = 0')) return [{ affectedRows: 1 }];
        if (sql.startsWith('UPDATE flights SET status =')) return [{ affectedRows: 1 }];
        if (sql.startsWith('DELETE FROM flight_segments')) return [{ affectedRows: 1 }];
        if (sql.startsWith('SELECT id, flight_id, ancillary_id FROM reservation_ancillaries')) return [[]];
        throw new Error(`Unexpected cancellation SQL: ${sql}`);
      }
    };
  }
};

const lifecycleState = { reservationStatus: 'pending', paymentStatus: 'pending_confirmation', released: false };
const lifecyclePool = {
  async getConnection() {
    return {
      async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
      async query(sql, params = []) {
        if (sql.startsWith('SELECT id, status FROM reservations WHERE pnr = ? FOR UPDATE')) {
          return [[{ id: 301, status: lifecycleState.reservationStatus }]];
        }
        if (sql.startsWith("UPDATE reservations SET status = 'cancelled'")) {
          lifecycleState.reservationStatus = 'cancelled';
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith("UPDATE payments SET status = 'cancelled' WHERE reservation_id = ?")) {
          lifecycleState.paymentStatus = 'cancelled';
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('DELETE FROM flight_segments WHERE reservation_id = ?')) {
          lifecycleState.released = true;
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('SELECT id, flight_id, ancillary_id FROM reservation_ancillaries')) return [[]];
        throw new Error(`Unexpected reservation lifecycle SQL: ${sql}`);
      }
    };
  }
};

const expirationState = { reservations: [{ id: 401, pnr: 'EXP401' }], reservationStatus: 'pending', paymentStatus: 'pending_confirmation', released: false };
const expirationPool = {
  async getConnection() {
    return {
      async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
      async query(sql) {
        if (sql.startsWith('SELECT id, pnr FROM reservations WHERE')) return [expirationState.reservations];
        if (sql.startsWith('SELECT id, flight_id, ancillary_id FROM reservation_ancillaries')) return [[]];
        if (sql.startsWith("UPDATE reservations SET status = 'expired'")) {
          expirationState.reservationStatus = 'expired';
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('UPDATE payments p')) {
          expirationState.paymentStatus = 'cancelled';
          return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('DELETE FROM flight_segments WHERE reservation_id IN')) {
          expirationState.released = true;
          return [{ affectedRows: 1 }];
        }
        throw new Error(`Unexpected expiration SQL: ${sql}`);
      }
    };
  }
};

const segmentReleaseStub = {
  async liberarPorReserva(id, connection) {
    await connection.query('DELETE FROM flight_segments WHERE reservation_id = ?', [id]);
  }
};

const returnDteStub = {
  CONFIG: { ambiente: '00', nit: '06141234561010', nombre: 'Emisor prueba', telefono: '22222222', correo: 'test@example.com' },
  fmtFecha(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  fmtHora(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; },
  uuidV4() { return `00000000-0000-4000-8000-${String(returnState.nextId++).padStart(12, '0')}`; }
};

Module._load = function (request, parent, isMain) {
  const filename = parent?.filename || '';
  if (request === '../config/db' && filename.endsWith('paymentService.js')) return paymentPool;
  if (request === './paymentGateway' && filename.endsWith('paymentService.js')) return gateway;
  if (request === '../config/db' && filename.endsWith('vuelosController.js')) return cancellationPool;
  if (request === '../config/db' && filename.endsWith('reservasController.js')) return lifecyclePool;
  if (request === '../models/Reserva' && filename.endsWith('reservasController.js')) return {};
  if (request === '../models/Pasajero' && filename.endsWith('reservasController.js')) return {};
  if (request === '../models/FlightSegment' && filename.endsWith('reservasController.js')) return segmentReleaseStub;
  if (request === '../utils/pnrGenerator' && filename.endsWith('reservasController.js')) return { generarPNRUnico: async () => 'TST000' };
  if (request === '../services/taxService' && filename.endsWith('reservasController.js')) return {};
  if (request === '../config/db' && filename.endsWith('expiracionService.js')) return expirationPool;
  if (request === '../config/db' && filename.endsWith(`${require('path').sep}models${require('path').sep}Vuelo.js`)) return noDbPool;
  if (request === '../services/taxService' && filename.endsWith('vuelosController.js')) return {};
  if (request === '../services/mailerService' && filename.endsWith('vuelosController.js')) return { enviarCancelacionVuelo: async () => {} };
  if (request === '../config/db' && filename.endsWith('dteEventosService.js')) return returnPool;
  if (request === './dteService' && filename.endsWith('dteEventosService.js')) return returnDteStub;
  if (request === '../../config/db' && filename.endsWith(`${require('path').sep}dte${require('path').sep}utils.js`)) return noDbPool;
  if (request === '../config/db' && filename.endsWith('dteService.js')) return noDbPool;
  if (request === './mhSimulatorService' && filename.endsWith('dteService.js')) return { estaOperativo: async () => true };
  return originalLoad.apply(this, arguments);
};

const { validarReceptor } = require('../src/services/dte/validators');
const paymentService = require('../src/services/paymentService');
const returnService = require('../src/services/dteEventosService');
const reservationController = require('../src/controllers/reservasController');
const expirationService = require('../src/services/expiracionService');
const { rateLimiter } = require('../src/middleware/rateLimiter');
const { assertNoActiveDte } = require('../src/services/dteService');
const { saldoReembolsable } = require('../src/utils/money');
const vuelosController = require('../src/controllers/vuelosController');

const result = [];
const test = async (name, fn) => {
  try { await fn(); result.push({ name, ok: true }); console.log(`PASS | ${name}`); }
  catch (error) { result.push({ name, ok: false, error: error.message }); console.error(`FAIL | ${name} | ${error.message}`); }
};

const pad = (n) => String(n).padStart(2, '0');
const dateText = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const datetimeText = (d) => `${dateText(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const baseReceiver = { tipoDocumento: null, numDocumento: null, nombre: 'CONSUMIDOR FINAL', nit: null, nrc: null };

(async () => {
  await test('FE bajo $25,000 permite comprador natural sin documento si no pide deducción', async () => {
    assert.deepEqual(validarReceptor(baseReceiver, '01', 24999.99), []);
  });
  await test('FE de exactamente $25,000 sigue la regla legal de monto superior a $25,000', async () => {
    assert.deepEqual(validarReceptor(baseReceiver, '01', 25000), []);
  });
  await test('FE sobre $25,000 requiere identificación del receptor', async () => {
    assert.match(validarReceptor(baseReceiver, '01', 25000.01).join(' '), /identificación/);
  });
  await test('FE bajo umbral requiere identificación cuando se marca gasto deducible', async () => {
    assert.match(validarReceptor(baseReceiver, '01', 50, { requiereDeduccionFiscal: true }).join(' '), /deducción/);
    assert.deepEqual(validarReceptor({ ...baseReceiver, tipoDocumento: '13', numDocumento: '01234567-8' }, '01', 50, { requiereDeduccionFiscal: true }), []);
  });
  await test('FE de comprador extranjero requiere identificación aun bajo el umbral', async () => {
    assert.match(validarReceptor(baseReceiver, '01', 50, { receptorExtranjero: true }).join(' '), /identificación/);
  });
  await test('bloqueo de emisión detecta un DTE activo y permite reintento tras rechazo', async () => {
    assert.throws(() => assertNoActiveDte([{ control_number: 'DTE-01-M001P001-000000000000001', transmission_status: 'accepted' }]), /DTE activo/);
    assert.doesNotThrow(() => assertNoActiveDte([]));
  });
  await test('rate limiter activo devuelve 429 y respeta RATE_LIMIT_DISABLED', async () => {
    const previous = process.env.RATE_LIMIT_DISABLED;
    const previousNodeEnv = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = 'test';
      delete process.env.RATE_LIMIT_DISABLED;
      const limiter = rateLimiter({ ventanaMs: 60000, maxPeticiones: 1 });
      const req = { ip: `regression-${Date.now()}-${Math.random()}` };
      let continuaciones = 0;
      let status = 200;
      const res = { status(code) { status = code; return this; }, json() { return this; } };
      limiter(req, res, () => { continuaciones++; });
      limiter(req, res, () => { continuaciones++; });
      assert.equal(continuaciones, 1);
      assert.equal(status, 429);

      process.env.RATE_LIMIT_DISABLED = 'true';
      limiter(req, res, () => { continuaciones++; });
      assert.equal(continuaciones, 2);
    } finally {
      if (previous === undefined) delete process.env.RATE_LIMIT_DISABLED;
      else process.env.RATE_LIMIT_DISABLED = previous;
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  await test('segunda transferencia no puede reservar un saldo ya pendiente de confirmación', async () => {
    Object.assign(paymentState, { reservation: { id: 7, status: 'pending', estimated_total: 100, paid_total: 0, time_limit: null }, payments: [], nextId: 1 });
    await paymentService.procesarPago({ reservation_id: 7, amount: 100, method: 'transfer', referencia: 'T1', receptorDte: { nit: '06141234561010', nrc: '1234567' } }, { id: 1 });
    await assert.rejects(() => paymentService.procesarPago({ reservation_id: 7, amount: 1, method: 'transfer', referencia: 'T2' }, { id: 1 }), /transferencias pendientes/);
    assert.equal(paymentState.payments.length, 1);
    assert.deepEqual(paymentState.payments[0].receptor_dte, { nit: '06141234561010', nrc: '1234567' });
  });
  await test('pago parcial devuelve el saldo restante sin marcar la reserva como pagada', async () => {
    Object.assign(paymentState, { reservation: { id: 12, status: 'pending', estimated_total: 100, paid_total: 0, time_limit: null }, payments: [], nextId: 1 });
    const pago = await paymentService.procesarPago({ reservation_id: 12, amount: 40, method: 'card' }, { id: 1 });
    assert.equal(pago.status, 'approved');
    assert.equal(pago.reservation_status, 'confirmed');
    assert.equal(pago.reservation_balance, 60);
  });
  await test('checkout acepta PayPal simulado y no bloquea por una intención antigua de tarjeta', async () => {
    Object.assign(paymentState, {
      reservation: { id: 121, status: 'pending', estimated_total: 75, paid_total: 0, time_limit: null },
      payments: [{ id: 80, reservation_id: 121, method: 'card', type: 'payment', status: 'pending_confirmation', amount: 75, external_reference: null }],
      nextId: 81
    });
    const pago = await paymentService.procesarPago({ reservation_id: 121, amount: 75, method: 'paypal' }, null);
    assert.equal(pago.status, 'approved');
    assert.equal(pago.reservation_status, 'paid');
    assert.equal(pago.reference, 'PP-TEST-1');
    assert.equal(paymentState.payments.at(-1).method, 'paypal');
  });
  await test('pago rechaza reservas vencidas usando el reloj de la base', async () => {
    Object.assign(paymentState, { reservation: { id: 13, status: 'pending', estimated_total: 100, paid_total: 0, time_limit: '2026-10-08 10:00:00' }, payments: [], nextId: 1, reservationExpired: true });
    await assert.rejects(() => paymentService.procesarPago({ reservation_id: 13, amount: 100, method: 'cash' }, { id: 1 }), /venció/);
    assert.equal(paymentState.payments.length, 0);
  });
  await test('montos de pago se limitan a centavos y un centavo pendiente no se da por pagado', async () => {
    Object.assign(paymentState, { reservation: { id: 14, status: 'pending', estimated_total: 100, paid_total: 0, time_limit: null }, payments: [], nextId: 1 });
    await assert.rejects(() => paymentService.procesarPago({ reservation_id: 14, amount: 0.001, method: 'card' }, { id: 1 }), /máximo 2 decimales/);
    const parcial = await paymentService.procesarPago({ reservation_id: 14, amount: 99.99, method: 'card' }, { id: 1 });
    assert.equal(parcial.reservation_status, 'confirmed');
    assert.equal(parcial.reservation_balance, 0.01);
    const final = await paymentService.procesarPago({ reservation_id: 14, amount: 0.01, method: 'cash' }, { id: 1 });
    assert.equal(final.reservation_status, 'paid');
    assert.equal(final.reservation_balance, 0);
  });
  await test('confirmar transferencia rechaza pago mayor al saldo actual', async () => {
    Object.assign(paymentState, { reservation: { id: 8, status: 'confirmed', estimated_total: 100, paid_total: 50 }, payments: [{ id: 4, reservation_id: 8, method: 'transfer', external_reference: 'T-4', type: 'payment', status: 'pending_confirmation', amount: 60 }], nextId: 5 });
    await assert.rejects(() => paymentService.confirmarTransferencia(4, { id: 1 }), /excede el saldo/);
    assert.equal(paymentState.reservation.paid_total, 50);
    assert.equal(paymentState.payments[0].status, 'pending_confirmation');
  });
  await test('confirmar transferencia ignora intenciones heredadas sin referencia de pago', async () => {
    Object.assign(paymentState, { reservation: { id: 81, status: 'pending', estimated_total: 100, paid_total: 0 }, payments: [{ id: 82, reservation_id: 81, method: 'transfer', type: 'payment', status: 'pending_confirmation', amount: 100, external_reference: null }], nextId: 83 });
    await assert.rejects(() => paymentService.confirmarTransferencia(82, { id: 1 }), /no encontrado/);
    assert.equal(paymentState.payments[0].status, 'pending_confirmation');
  });
  await test('reembolsos parciales acumulados no superan el pago original', async () => {
    gateway.refundCalls = 0;
    Object.assign(paymentState, { reservation: { id: 9, status: 'paid', estimated_total: 100, paid_total: 100 }, payments: [{ id: 6, reservation_id: 9, type: 'payment', status: 'approved', amount: 100, method: 'cash' }], nextId: 7 });
    await paymentService.reembolsar(6, 60, 'Devolución parcial', { id: 1 });
    await assert.rejects(() => paymentService.reembolsar(6, 60, 'Segundo intento', { id: 1 }), /saldo reembolsable.*40.00/);
    assert.equal(gateway.refundCalls, 1);
    assert.equal(paymentState.reservation.paid_total, 40);
  });
  await test('cancelar vuelo devuelve solo el saldo de cada pago que aún no fue reembolsado', async () => {
    cancellationState.refundAmount = 0;
    cancellationState.reservationStatus = 'confirmed';
    cancellationState.pendingTransferStatus = 'pending_confirmation';
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await vuelosController.cancelarVuelo({ params: { id: 41 }, body: { confirmar: true } }, response);
    assert.equal(saldoReembolsable(100, 30), 70);
    assert.equal(saldoReembolsable(100, 100), 0);
    assert.equal(response.statusCode, 200);
    assert.equal(cancellationState.refundAmount, 70);
    assert.equal(response.data.datos.totalReembolsado, 70);
    assert.equal(cancellationState.reservationStatus, 'cancelled');
    assert.equal(cancellationState.pendingTransferStatus, 'cancelled');
  });
  await test('cancelar reserva libera asientos y cancela transferencias pendientes en la misma transacción', async () => {
    Object.assign(lifecycleState, { reservationStatus: 'pending', paymentStatus: 'pending_confirmation', released: false });
    const response = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.data = data; return this; }
    };
    await reservationController.cancelarReserva({ params: { pnr: 'TST301' }, body: { motivo: 'Prueba' } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(lifecycleState.reservationStatus, 'cancelled');
    assert.equal(lifecycleState.paymentStatus, 'cancelled');
    assert.equal(lifecycleState.released, true);
  });
  await test('expirar reserva libera asientos y cancela transferencias pendientes', async () => {
    Object.assign(expirationState, { reservationStatus: 'pending', paymentStatus: 'pending_confirmation', released: false });
    const result = await expirationService.expirarReservas();
    assert.equal(result.expiradas, 1);
    assert.equal(expirationState.reservationStatus, 'expired');
    assert.equal(expirationState.paymentStatus, 'cancelled');
    assert.equal(expirationState.released, true);
  });
  await test('job de expiración limpia transferencias pendientes huérfanas de reservas terminales', async () => {
    expirationState.reservations = [];
    expirationState.reservationStatus = 'cancelled';
    expirationState.paymentStatus = 'pending_confirmation';
    expirationState.released = false;
    const result = await expirationService.expirarReservas();
    assert.equal(result.expiradas, 0);
    assert.equal(expirationState.paymentStatus, 'cancelled');
  });
  await test('reembolso no reactiva una reserva cancelada', async () => {
    Object.assign(paymentState, { reservation: { id: 13, status: 'cancelled', estimated_total: 100, paid_total: 100 }, payments: [{ id: 7, reservation_id: 13, type: 'payment', status: 'approved', amount: 100, method: 'cash' }], nextId: 8 });
    await paymentService.reembolsar(7, 100, 'Reembolso luego de cancelar', { id: 1 });
    assert.equal(paymentState.reservation.paid_total, 0);
    assert.equal(paymentState.reservation.status, 'cancelled');
  });

  await test('retornos parciales repetidos suman hasta el valor original, sin excederlo', async () => {
    const now = new Date();
    const uuid = '00000000-0000-4000-8000-000000000101';
    returnState.docs = [{
      id: 101, uuid_generation: uuid, dte_type: '01', transmission_status: 'accepted',
      reception_seal: 'SELLO-PRUEBA', reception_date: datetimeText(new Date(now.getTime() - 86400000)),
      emission_date: dateText(new Date(now.getTime() - 86400000)), total_to_pay: '200.00',
      issuer_nit: '06141234561010', receiver_name: 'CONSUMIDOR FINAL', receiver_doc_type: null, receiver_doc_number: null,
      full_json: JSON.stringify({ identificacion: { tipoDte: '01', fecEmi: dateText(new Date(now.getTime() - 86400000)) }, emisor: { nit: '06141234561010' }, receptor: { nombre: 'CONSUMIDOR FINAL' }, resumen: { totalPagar: 200, totalGravada: 200, totalIva: 0, totalNoGravado: 0, tributos: null } })
    }];
    returnState.events = []; returnState.nextId = 1; returnState.rollbacks = 0;
    const first = await returnService.retornarDTE(uuid, { monto: 70, motivo: 'Reembolso parcial 1' });
    const second = await returnService.retornarDTE(uuid, { monto: 80, motivo: 'Reembolso parcial 2' });
    assert.equal(first.evento.resumen.totalPagar, 70);
    assert.equal(second.evento.resumen.totalPagar, 80);
    assert.equal(first.evento.identificacion.tipoEvento, '18');
    assert.equal(first.evento.documentosRelacionados.length, 1);
    assert.deepEqual(first.evento.documentosRelacionados[0], {
      tipoDocumento: '01', tipoGeneracion: 2, numeroDocumento: uuid,
      fechaGeneracion: dateText(new Date(now.getTime() - 86400000))
    });
    assert.equal(first.evento.cuerpoDocumento[0].numeroDocumento, uuid);
    await assert.rejects(() => returnService.retornarDTE(uuid, { monto: 51, motivo: 'Sobre el saldo' }), /supera el saldo retornable/);
    const last = await returnService.retornarDTE(uuid, { monto: 50, motivo: 'Saldo final' });
    assert.equal(last.evento.resumen.totalPagar, 50);
    assert.equal(returnState.events.reduce((sum, event) => sum + event.returned_amount, 0), 200);
    await assert.rejects(() => returnService.retornarDTE(uuid, { monto: 0.01, motivo: 'Exceso final' }), /supera el saldo retornable/);
    assert.equal(returnState.events.length, 3);
  });

  await test('retorno no puede fecharse antes de la generación del DTE', async () => {
    const tomorrow = new Date(Date.now() + 86400000);
    const futureUuid = '00000000-0000-4000-8000-000000000102';
    returnState.docs = [{
      id: 102, uuid_generation: futureUuid, dte_type: '01', transmission_status: 'accepted',
      reception_seal: 'SELLO-PRUEBA', reception_date: datetimeText(tomorrow),
      emission_date: dateText(tomorrow), total_to_pay: '20.00', issuer_nit: '06141234561010',
      full_json: JSON.stringify({ identificacion: { tipoDte: '01', fecEmi: dateText(tomorrow) }, emisor: { nit: '06141234561010' }, receptor: { nombre: 'CLIENTE' }, resumen: { totalPagar: 20 } })
    }];
    returnState.events = []; returnState.nextId = 1;
    await assert.rejects(() => returnService.retornarDTE(futureUuid, { monto: 10, motivo: 'Fecha inválida' }), /fecha de generación futura/);
    assert.equal(returnState.events.length, 0);
  });

  await test('retorno multifactura conserva numeración consecutiva si un DTE ya fue agotado', async () => {
    const today = new Date();
    const uuidAgotado = '00000000-0000-4000-8000-000000000103';
    const uuidDisponible = '00000000-0000-4000-8000-000000000104';
    const doc = (id, uuid, amount) => ({
      id, uuid_generation: uuid, dte_type: '01', transmission_status: 'accepted',
      reception_seal: 'SELLO-PRUEBA', reception_date: datetimeText(new Date(today.getTime() - 86400000)),
      emission_date: dateText(new Date(today.getTime() - 86400000)), total_to_pay: String(amount),
      issuer_nit: '06141234561010', full_json: JSON.stringify({
        identificacion: { tipoDte: '01', fecEmi: dateText(new Date(today.getTime() - 86400000)) },
        emisor: { nit: '06141234561010' }, receptor: { nombre: 'MISMO CLIENTE' },
        resumen: { totalPagar: amount }
      })
    });
    returnState.docs = [doc(103, uuidAgotado, 100), doc(104, uuidDisponible, 100)];
    returnState.events = [{ id: 1, dte_id: 103, returned_amount: 100 }];
    returnState.nextId = 2;
    const result = await returnService.retornarDTEs([uuidAgotado, uuidDisponible], { monto: 50, motivo: 'Retorno multifactura' });
    assert.deepEqual(result.evento.documentosRelacionados.map((item) => item.numeroDocumento), [uuidDisponible]);
    assert.deepEqual(result.evento.cuerpoDocumento.map((item) => item.numItem), [1]);
  });

  Module._load = originalLoad;
  const failed = result.filter((x) => !x.ok);
  console.log(`\nRESULTADO: ${result.length - failed.length}/${result.length} passed`);
  if (failed.length) process.exitCode = 1;
})().catch((error) => { Module._load = originalLoad; console.error(error); process.exitCode = 1; });
