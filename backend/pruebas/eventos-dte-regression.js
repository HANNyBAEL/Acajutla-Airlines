// Regression tests for the educational DTE contingency/invalidation simulator.
// Uses an in-memory MySQL pool stub; it never connects to or changes the real DB.
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;

const state = { docs: [], contingencies: [], contingencyDocs: [], invalidations: [], nextId: 1, commits: 0, rollbacks: 0 };
const clone = (value) => JSON.parse(JSON.stringify(value));
const pending = (d) => d.transmission_status === 'contingency' || (d.transmission_status === 'transmitted' && !d.reception_seal);

function execute(sql, params = []) {
  if (sql.startsWith('SELECT id FROM dte_headers')) return [state.docs.filter(pending).map(({ id }) => ({ id }))];
  if (sql.startsWith('SELECT id, dte_type, uuid_generation, transmission_status, emission_date, emission_time FROM dte_headers')) {
    return [state.docs.filter((d) => params[0].map(Number).includes(Number(d.id)) && pending(d)).map((d) => ({ ...d }))];
  }
  if (sql.startsWith("UPDATE dte_headers SET transmission_status = 'contingency'")) {
    for (const d of state.docs) if (params[0].map(Number).includes(Number(d.id))) { d.transmission_status = 'contingency'; d.billing_model = 2; d.operation_type = 2; }
    return [{ affectedRows: params[0].length }];
  }
  if (sql.startsWith('INSERT INTO contingency_events')) {
    const ev = { id: state.nextId++, uuid: params[0], estado: 'transmitido', full_json: params.at(-1) };
    state.contingencies.push(ev); return [{ insertId: ev.id }];
  }
  if (sql.startsWith('INSERT INTO contingency_event_docs')) {
    state.contingencyDocs.push({ event_id: params[0], dte_id: params[1] }); return [{ insertId: state.nextId++ }];
  }
  if (sql.startsWith("UPDATE contingency_events SET estado = 'aceptado'")) {
    const ev = state.contingencies.find((e) => e.id === params[1]); ev.estado = 'aceptado'; ev.sello = params[0]; return [{ affectedRows: 1 }];
  }
  if (sql.startsWith("UPDATE dte_headers SET transmission_status = 'accepted'")) {
    for (const d of state.docs) if (params[1].map(Number).includes(Number(d.id))) { d.transmission_status = 'accepted'; d.reception_seal = params[0]; }
    return [{ affectedRows: params[1].length }];
  }
  if (sql.startsWith('SELECT * FROM dte_headers WHERE uuid_generation = ? FOR UPDATE')) {
    const doc = state.docs.find((d) => d.uuid_generation === params[0]); return [doc ? [{ ...doc }] : []];
  }
  if (sql.startsWith('SELECT id, dte_type, transmission_status, reception_seal FROM dte_headers')) {
    const doc = state.docs.find((d) => d.uuid_generation === params[0]); return [doc ? [{ id: doc.id, dte_type: doc.dte_type, transmission_status: doc.transmission_status, reception_seal: doc.reception_seal }] : []];
  }
  if (sql.startsWith('INSERT INTO dte_invalidation_events')) {
    const ev = { id: state.nextId++, uuid: params[0], params }; state.invalidations.push(ev); return [{ insertId: ev.id }];
  }
  if (sql.startsWith('UPDATE dte_invalidation_events SET sello')) return [{ affectedRows: 1 }];
  if (sql.startsWith("UPDATE dte_headers SET transmission_status = 'invalidated'")) {
    const doc = state.docs.find((d) => d.id === params[0]); doc.transmission_status = 'invalidated'; return [{ affectedRows: 1 }];
  }
  throw new Error(`Unexpected SQL in regression test: ${sql}`);
}

const fakePool = {
  async query(sql) {
    if (sql.startsWith('SHOW COLUMNS FROM contingency_events')) return [[{ Field: 'uuid' }]];
    throw new Error(`Unexpected pool SQL in regression test: ${sql}`);
  },
  async getConnection() {
    const snapshot = clone(state);
    return {
      async beginTransaction() {},
      async query(sql, params) { return execute(sql, params); },
      async commit() { state.commits++; },
      async rollback() { Object.assign(state, snapshot); state.rollbacks++; },
      release() {}
    };
  }
};

const fakeDte = {
  CONFIG: { ambiente: '00', nit: '00000000000000', nombre: 'Emisor prueba', telefono: '22222222', correo: 'test@example.com' },
  fmtFecha(value) { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  fmtHora(value) { const d = new Date(value); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; },
  uuidV4: () => `00000000-0000-4000-8000-${String(state.nextId).padStart(12, '0')}`
};

Module._load = function (request, parent, isMain) {
  if (parent?.filename.endsWith('dteEventosService.js') && request === '../config/db') return fakePool;
  if (parent?.filename.endsWith('dteEventosService.js') && request === './dteService') return fakeDte;
  if (parent?.filename.endsWith('utils.js') && request === '../../config/db') return fakePool;
  return originalLoad.apply(this, arguments);
};

const service = require('../src/services/dteEventosService');
const fiscal = require('../src/services/fiscalCompliance');
const dteValidators = require('../src/services/dte/validators');
const actor = { nombre: 'Responsable prueba', tipoDoc: '13', numDoc: '00000000-0' };
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const ymd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const hm = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const sqlDateTime = (date) => `${ymd(date)} ${hm(date)}:${pad(date.getSeconds())}`;
const today = ymd(now);
const emission = new Date(now.getTime() - 45 * 60 * 1000);
const outage = { fInicio: ymd(new Date(now.getTime() - 2 * 60 * 60 * 1000)), hInicio: hm(new Date(now.getTime() - 2 * 60 * 60 * 1000)), fFin: ymd(new Date(now.getTime() - 30 * 60 * 1000)), hFin: hm(new Date(now.getTime() - 30 * 60 * 1000)), tipoContingencia: 1, responsable: actor };
const dte = (id, type, status, emissionDate = today, receptionDate = sqlDateTime(new Date(now.getTime() - 20 * 60 * 1000))) => ({
  id, dte_type: type, uuid_generation: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
  control_number: `CTRL-${id}`, transmission_status: status, reception_seal: status === 'accepted' ? 'MH-SELLO' : null,
  reception_date: receptionDate, created_at: receptionDate, emission_date: emissionDate,
  emission_time: hm(emission), receiver_doc_type: '13', receiver_doc_number: '00000000-0', receiver_name: 'Receptor prueba'
});
function reset(docs = []) { Object.assign(state, { docs, contingencies: [], contingencyDocs: [], invalidations: [], nextId: 1, commits: 0, rollbacks: 0 }); }

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`PASS | ${name}`); }
  catch (e) { failed++; console.error(`FAIL | ${name} | ${e.message}`); }
}

(async () => {
  await test('contingencia asocia solo pendientes y completa transición simulada', async () => {
    reset([dte(1, '01', 'contingency'), dte(2, '03', 'transmitted'), dte(3, '01', 'accepted')]);
    const r = await service.transmitirEventoContingencia(outage);
    assert.equal(r.documentos, 2); assert.equal(state.contingencyDocs.length, 2); assert.equal(state.contingencies[0].estado, 'aceptado');
    assert.equal(state.docs[0].transmission_status, 'accepted'); assert.equal(state.docs[1].transmission_status, 'accepted'); assert.equal(state.docs[2].reception_seal, 'MH-SELLO');
    assert.equal(state.commits, 1);
  });
  await test('contingencia no transmite sin pendientes', async () => { reset(); await assert.rejects(() => service.transmitirEventoContingencia(outage), /No hay DTEs pendientes/); });
  await test('contingencia rechaza CAT-005 inválido y motivo 5 vacío', async () => {
    reset([dte(1, '01', 'contingency')]); await assert.rejects(() => service.transmitirEventoContingencia({ ...outage, tipoContingencia: 6 }), /CAT-005/);
    await assert.rejects(() => service.transmitirEventoContingencia({ ...outage, tipoContingencia: 5 }), /tipo de contingencia 5/);
  });
  await test('contingencia rechaza orden temporal incorrecto y más de 24 horas', async () => {
    reset([dte(1, '01', 'contingency')]);
    await assert.rejects(() => service.transmitirEventoContingencia({ ...outage, hInicio: '23:00', hFin: '01:00' }), /inicio.*anterior/);
    const fin = new Date(now.getTime() - 26 * 60 * 60 * 1000), inicio = new Date(now.getTime() - 27 * 60 * 60 * 1000);
    await assert.rejects(() => service.transmitirEventoContingencia({ ...outage, fInicio: ymd(inicio), hInicio: hm(inicio), fFin: ymd(fin), hFin: hm(fin) }), /24 horas/);
  });
  await test('contingencia rechaza DTE generado fuera del período', async () => {
    reset([dte(1, '01', 'contingency', '2020-01-01')]); await assert.rejects(() => service.transmitirEventoContingencia(outage), /fuera del período/);
  });
  await test('contingencia rechaza lote superior a 1000 sin truncarlo', async () => {
    reset(Array.from({ length: 1001 }, (_, i) => dte(i + 1, '01', 'contingency')));
    await assert.rejects(() => service.transmitirEventoContingencia(outage), /no puede exceder 1000/);
  });
  await test('contingencia revierte la transacción ante una selección parcialmente inválida', async () => {
    reset([dte(1, '01', 'contingency'), dte(2, '01', 'accepted')]);
    await assert.rejects(() => service.transmitirEventoContingencia({ ...outage, dte_ids: [1, 2] }), /Todos los DTEs seleccionados/);
    assert.equal(state.contingencies.length, 0); assert.equal(state.rollbacks, 1);
  });
  await test('invalidación FE tipo 2 genera evento y actualiza estado atómicamente', async () => {
    reset([dte(1, '01', 'accepted', today)]);
    const r = await service.invalidarDTE(state.docs[0].uuid_generation, { tipoAnulacion: 2, motivo: 'Prueba didáctica', responsable: actor, solicitante: actor });
    assert.equal(r.evento.documento.codigoGeneracionR, null); assert.equal(state.docs[0].transmission_status, 'invalidated'); assert.equal(state.commits, 1);
  });
  await test('invalidación CCFE conserva la fecha SQL exacta y permite plazo vigente', async () => {
    const sello = new Date(now.getFullYear(), now.getMonth(), 1);
    reset([dte(1, '03', 'accepted', today, sqlDateTime(sello))]);
    const r = await service.invalidarDTE(state.docs[0].uuid_generation, { tipoAnulacion: 2, motivo: 'Prueba didáctica', responsable: actor, solicitante: actor });
    assert.equal(r.evento.identificacion.fecCEmi, today);
  });
  await test('invalidación tipo 1 exige reemplazo aceptado del mismo tipo', async () => {
    const source = dte(1, '01', 'accepted', today), replacement = dte(2, '01', 'accepted', today);
    reset([source, replacement]);
    await assert.rejects(() => service.invalidarDTE(source.uuid_generation, { tipoAnulacion: 1, motivo: 'Corrección', responsable: actor, solicitante: actor }), /Debe indicar.*reemplazo/);
    const r = await service.invalidarDTE(source.uuid_generation, { tipoAnulacion: 1, motivo: 'Corrección', codigoReemplazo: replacement.uuid_generation, responsable: actor, solicitante: actor });
    assert.equal(r.evento.documento.codigoGeneracionR, replacement.uuid_generation);
  });
  await test('invalidación rechaza reemplazo sin sello o de tipo distinto', async () => {
    const source = dte(1, '01', 'accepted', today), pending = dte(2, '01', 'contingency'), wrongType = dte(3, '03', 'accepted');
    reset([source, pending, wrongType]);
    const request = (codigoReemplazo) => service.invalidarDTE(source.uuid_generation, { tipoAnulacion: 3, motivo: 'Corrección', codigoReemplazo, responsable: actor, solicitante: actor });
    await assert.rejects(() => request(pending.uuid_generation), /debe existir.*estar aceptado/);
    await assert.rejects(() => request(wrongType.uuid_generation), /mismo tipo/);
    assert.equal(state.invalidations.length, 0);
  });
  await test('invalidación de tipo desconocido, DTE no aceptado y DTE ausente se rechaza', async () => {
    reset([dte(1, '01', 'accepted', today), dte(2, '01', 'contingency')]);
    await assert.rejects(() => service.invalidarDTE('x', { tipoAnulacion: 99, motivo: 'x', responsable: actor, solicitante: actor }), /CAT-024/);
    await assert.rejects(() => service.invalidarDTE(state.docs[1].uuid_generation, { tipoAnulacion: 2, motivo: 'x', responsable: actor, solicitante: actor }), /Solo se pueden invalidar/);
    await assert.rejects(() => service.invalidarDTE('MISSING', { tipoAnulacion: 2, motivo: 'x', responsable: actor, solicitante: actor }), /DTE no encontrado/);
  });
  await test('invalidación FE valida fecha del evento contra fecha de generación', async () => {
    const old = new Date(now.getFullYear(), now.getMonth() - 4, 1);
    reset([dte(1, '01', 'accepted', ymd(old), sqlDateTime(now))]);
    await assert.rejects(() => service.invalidarDTE(state.docs[0].uuid_generation, { tipoAnulacion: 2, motivo: 'x', responsable: actor, solicitante: actor }), /fecha del evento/);
  });
  await test('invalidación CCFE vence al pasar el décimo día hábil del mes siguiente', async () => {
    const old = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    reset([dte(1, '03', 'accepted', ymd(old), sqlDateTime(old))]);
    await assert.rejects(() => service.invalidarDTE(state.docs[0].uuid_generation, { tipoAnulacion: 2, motivo: 'x', responsable: actor, solicitante: actor }), /10 días hábiles/);
  });
  await test('validador fiscal usa plazos de fecha de generación y sello', async () => {
    const verdict = fiscal.validarPlazoInvalidacion({ identificacion: { tipoDte: '03', fecEmi: today } }, today, now, sqlDateTime(new Date(now.getFullYear(), now.getMonth(), 1)));
    assert.equal(verdict.ok, true);
    const invalid = fiscal.validarPlazoInvalidacion({ identificacion: { tipoDte: '01', fecEmi: '2020-01-01' } }, today, now, sqlDateTime(now));
    assert.equal(invalid.ok, false);
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    assert.equal(fiscal.validarPlazoInvalidacion({ identificacion: { tipoDte: '03', fecEmi: today } }, ymd(future), now, sqlDateTime(now)).ok, false);
  });
  await test('validador de DTE rechaza CAT-005 inválido y motivo 5 vacío', async () => {
    const base = { version: 2, ambiente: '00', tipoDte: '01', codigoGeneracion: '00000000-0000-4000-8000-000000000001', numeroControl: 'DTE-01-M001P001-000000000000001', tipoModelo: 2, tipoOperacion: 2, tipoContingencia: 6, motivoContin: null, fecEmi: today, horEmi: '12:00:00', tipoMoneda: 'USD' };
    assert.ok(dteValidators.validarIdentificacion(base, '01').some((e) => e.includes('CAT-005') || e.includes('contingencia')));
    assert.ok(dteValidators.validarIdentificacion({ ...base, tipoContingencia: 5 }, '01').some((e) => e.includes('motivoContin requerido')));
  });
  console.log(`\nRESULTADO: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });
