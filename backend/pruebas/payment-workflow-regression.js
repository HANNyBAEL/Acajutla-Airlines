const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;

const state = { payment: { id: 31, reservation_id: 9, status: 'approved' }, updates: [], emitted: [], paymentResult: null, dteError: null };
const paymentService = {
  async procesarPago(datos, usuario) {
    state.paymentInput = { datos, usuario };
    return state.paymentResult;
  }
};
const dteService = {
  async emitirYEnviar(...args) {
    state.emitted.push(args);
    if (state.dteError) throw new Error(state.dteError);
    return { numeroControl: 'DTE-TEST' };
  }
};
const pool = {
  async query(sql, params) {
    if (sql.startsWith('SELECT * FROM payments WHERE id = ?')) return [[{ ...state.payment }]];
    if (sql.startsWith('UPDATE payments SET tipo_dte')) {
      state.updates.push(params);
      return [{ affectedRows: 1 }];
    }
    throw new Error(`SQL inesperado: ${sql}`);
  }
};

Module._load = function (request, parent, isMain) {
  if (request === './paymentService' && parent?.filename.endsWith('paymentWorkflowService.js')) return paymentService;
  if (request === './pagoDteService' && parent?.filename.endsWith('paymentWorkflowService.js')) return dteService;
  if (request === '../config/db' && parent?.filename.endsWith('paymentWorkflowService.js')) return pool;
  return originalLoad.apply(this, arguments);
};

(async () => {
  try {
    const workflow = require('../src/services/paymentWorkflowService');
    state.paymentResult = { payment_id: 31, status: 'approved', reservation_status: 'paid' };
    const user = { id: 7, rol: 'cashier' };
    const receptor = { nombre: 'CLIENTE DE PRUEBA', correo: 'test@example.com' };
    const aprobado = await workflow.procesarPagoCompleto({ reservation_id: 9, method: 'card', tipo_dte: '01', receptor }, user);
    assert.equal(aprobado.exito, true);
    assert.deepEqual(state.paymentInput.usuario, user);
    assert.deepEqual(state.paymentInput.datos.receptorDte, receptor);
    assert.deepEqual(state.updates.at(-1), ['01', 31]);
    assert.equal(state.emitted.length, 1);
    assert.deepEqual(aprobado.dte, { numeroControl: 'DTE-TEST' });

    state.emitted = [];
    state.payment.status = 'pending_confirmation';
    state.paymentResult = { payment_id: 31, status: 'pending_confirmation', reservation_status: 'pending' };
    const pendiente = await workflow.procesarPagoCompleto({ reservation_id: 9, method: 'transfer' }, null);
    assert.equal(pendiente.dte, null);
    assert.equal(state.emitted.length, 0);

    state.payment.status = 'approved';
    state.paymentResult = { payment_id: 31, status: 'approved', reservation_status: 'paid' };
    state.dteError = 'error de prueba';
    const errorDte = await workflow.procesarPagoCompleto({ reservation_id: 9, method: 'card' }, null);
    assert.deepEqual(errorDte.dte, { error: 'error de prueba' });
    console.log('PASS | el workflow comparte pago, espera confirmación y conserva el error DTE sin revertir el pago');
  } finally {
    Module._load = originalLoad;
  }
})().catch((error) => {
  Module._load = originalLoad;
  console.error('FAIL | workflow de pago checkout web:', error.message);
  process.exitCode = 1;
});
