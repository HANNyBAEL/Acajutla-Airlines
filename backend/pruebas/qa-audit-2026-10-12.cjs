// Additional acceptance checks from the 2026-10-12 audit.
// Real application functions/routes; all database, email and MH I/O is replaced.
// A FAIL is an unmet acceptance criterion. Never connects to the configured DB.
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
process.env.TZ = 'America/El_Salvador';
process.env.JWT_SECRET = 'isolated-qa-access-secret-not-for-deployment';
process.env.REFRESH_SECRET = 'isolated-qa-refresh-secret-not-for-deployment';
process.env.DTE_AMBIENTE = '00';
delete process.env.RATE_LIMIT_DISABLED;
let queryHandler = async (sql) => { throw new Error('Unexpected isolated SQL: ' + sql); };
const pool = {
  query: (...args) => queryHandler(...args),
  getConnection: async () => ({ query: (...args) => queryHandler(...args),
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {} }),
};
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (/config\/db$/.test(request)) return pool;
  if (/config\/brevo$/.test(request)) return { enviarCorreo: async () => { throw new Error('Email disabled during QA'); } };
  if (request === 'dotenv') return { config: () => ({}) };
  if (request === './mhSimulatorService') return { estaOperativo: async () => true };
  return originalLoad.apply(this, arguments);
};
const { Usuario } = require('../src/models/Usuario');
const Auth = require('../src/services/authService');
const Gateway = require('../src/services/paymentGateway');
const Payment = require('../src/services/paymentService');
const Checkin = require('../src/controllers/checkinController');
const Commercial = require('../src/controllers/comercialController');
const Operations = require('../src/controllers/operacionesController');
const Dte = require('../src/services/dteService');
const Validators = require('../src/services/dte/validators');
const { rateLimiter } = require('../src/middleware/rateLimiter');
const { auditarCambios } = require('../src/middleware/audit');
const express = require('express');
const jwt = require('jsonwebtoken');
Gateway.simularLatencia = async () => {};
const results = [];
function response() {
  return { statusCode: 200, body: null, status(n) { this.statusCode = n; return this; },
    json(body) { this.body = body; return this; } };
}
async function test(id, name, fn) {
  try { await fn(); results.push({id, name, passed: true}); console.log(`PASS | ${id} | ${name}`); }
  catch(e) { results.push({id, name, passed: false, detail: e.message}); console.log(`FAIL | ${id} | ${name} | ${e.message}`); }
}
const tomorrow = () => new Date(Date.now() + 86400000).toISOString();
function paymentFixture({ expired = false, reference = 'BANK-TEST' } = {}) {
  const state = { reservation: { id: 7, status: 'pending', estimated_total: 100, paid_total: 0,
    time_limit: expired ? '2000-01-01 00:00:00' : null }, payment: { id: 8, reservation_id: 7,
    amount: 100, method: 'transfer', status: 'pending_confirmation', type: 'payment', external_reference: reference }, inserted: [] };
  queryHandler = async (sql, params = []) => {
    if (sql.startsWith('SELECT * FROM reservations')) return [[{...state.reservation}]];
    if (sql.startsWith('SELECT time_limit')) return [[{vencida: expired ? 1 : 0}]];
    if (sql.startsWith('SELECT COALESCE(SUM(amount)')) return [[{amount: 0}]];
    if (sql.startsWith('SELECT reservation_id FROM payments')) return [[{reservation_id: 7}]];
    if (sql.startsWith('SELECT * FROM payments')) return [[{...state.payment}]];
    if (sql.startsWith('INSERT INTO payments')) { state.inserted.push(params); return [{insertId: 8}]; }
    if (sql.startsWith('UPDATE payments')) { state.payment.status = params[0]; return [{affectedRows: 1}]; }
    if (sql.startsWith('UPDATE reservations')) {
      state.reservation.paid_total = params[0]; state.reservation.status = params[1]; return [{affectedRows: 1}];
    }
    throw new Error('Unexpected payment SQL: ' + sql);
  };
  return state;
}
function checkinFixture({ crew = ['pilot','copilot'], status = 'paid', capacity = 74 } = {}) {
  const state = { writes: [], segment: { id: 1, flight_id: 2, reservation_id: 7, passenger_type: 'adult',
    birth_date: '1990-01-01', res_status: status, paid_total: status === 'confirmed' ? 1 : 100,
    estimated_total: 100, checkin_status: 'pending', seat: '1A', pnr: 'QA0001',
    departure_datetime: tomorrow(), flight_status: 'scheduled', total_capacity: capacity } };
  queryHandler = async (sql, params = []) => {
    if (sql.includes('FROM flight_segments fs') && sql.includes('WHERE fs.id = ? FOR UPDATE')) return [[{...state.segment}]];
    if (sql.includes('SELECT cm.role_operativo')) return [crew.map(role_operativo => ({role_operativo}))];
    if (sql.includes('FROM config_params')) return [[{param_value: '45'}]];
    if (sql.startsWith('SELECT fs.id') || sql.startsWith('SELECT fs.seat')) return [[]];
    if (sql.startsWith('UPDATE flight_segments')) { state.writes.push({sql, params}); return [{affectedRows: 1}]; }
    throw new Error('Unexpected check-in SQL: ' + sql);
  };
  return state;
}
function dteFixture() {
  const state = { headers: [] };
  queryHandler = async (sql, params = []) => {
    if (sql.includes('FROM reservations r LEFT JOIN customers')) return [[{id: 7, pnr:'QA0001', status:'paid', estimated_total:100, paid_total:100, c_first:'QA', c_last:'Synthetic', c_doctype:'DUI', c_docnum:'00000000-0'}]];
    if (sql.startsWith('SELECT * FROM passengers')) return [[{id: 1, first_names:'QA', last_names:'Synthetic'}]];
    if (sql.includes('SELECT DISTINCT f.flight_number')) return [[{flight_number:'QA1', departure_datetime:tomorrow()}]];
    if (sql.startsWith('SELECT * FROM payments')) return [[{id:1,method:'cash',amount:100,external_reference:null}]];
    if (sql.includes('original_payment_id')) return [[]];
    if (sql.includes('FROM reservation_tax_lines')) return [[]];
    if (sql.includes('GET_LOCK')) return [[{acquired:1}]];
    if (sql.includes('RELEASE_LOCK')) return [[{released:1}]];
    if (sql.includes('MAX(CAST(RIGHT(control_number')) return [[{n:1}]];
    if (sql.includes('FROM flight_segments WHERE reservation_id')) return [[{passenger_id:1,base:100}]];
    if (sql.includes('FROM reservation_ancillaries')) return [[]];
    if (sql.startsWith('SELECT id, status FROM reservations')) return [[{id:7,status:'paid'}]];
    if (sql.startsWith('SELECT uuid_generation')) return [[]];
    if (sql.startsWith('INSERT INTO dte_headers')) { state.headers.push(JSON.parse(params[11])); return [{insertId:1}]; }
    if (sql.startsWith('INSERT INTO dte_items') || sql.startsWith('UPDATE dte_headers')) return [{affectedRows:1}];
    throw new Error('Unexpected DTE SQL: ' + sql);
  };
  return state;
}
(async () => {
  await test('AUTH-01', 'MFA generates a six-digit code without runtime error', async () => {
    queryHandler = async () => [{affectedRows:1}];
    assert.match(await Usuario.generarCodigoMFA(1), /^\d{6}$/);
  });
  await test('AUTH-02', 'A new MFA challenge works after the previous challenge was consumed', async () => {
    // Isolate the second defect by supplying the missing Node crypto binding in this test process only.
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const state = {used:true,code:'000000'};
    Object.defineProperty(globalThis, 'crypto', {configurable:true,value:require('node:crypto')});
    queryHandler = async (sql, params) => {
      if(sql.includes('INSERT INTO mfa_codes')) { state.code=params[1]; if(/UPDATE[\s\S]*used\s*=\s*(FALSE|0)/i.test(sql)) state.used=false; return [{affectedRows:1}]; }
      if(sql.includes('SELECT * FROM mfa_codes')) return [state.used ? [] : [{id:1}]];
      if(sql.startsWith('UPDATE mfa_codes')) { state.used=true; return [{affectedRows:1}]; }
      throw new Error('Unexpected MFA SQL');
    };
    try { const code=await Usuario.generarCodigoMFA(1); assert.equal(await Usuario.verificarCodigoMFA(1,code),true,'New code remains used=true'); }
    finally { if(descriptor) Object.defineProperty(globalThis,'crypto',descriptor); else delete globalThis.crypto; }
  });
  await test('AUTH-03', 'A temporarily blocked account cannot log in', async () => {
    const saved = {...Usuario};
    Object.assign(Usuario, { buscarPorCredencial:async()=>({id:1,username:'qa',role:'customer',status:'active',blocked_until:tomorrow()}),
      estaBloqueado:async()=>true,
      verificarPassword:async()=>true, resetearIntentosFallidos:async()=>{}, guardarRefreshToken:async()=>{}, actualizarUltimoLogin:async()=>{} });
    try { await assert.rejects(()=>Auth.login('qa','irrelevant'),/bloqueada/i); }
    finally { Object.assign(Usuario,saved); }
  });
  await test('AUTH-04', 'An inactive account cannot exchange an MFA code for tokens', async () => {
    const saved={...Usuario};
    Object.assign(Usuario,{verificarCodigoMFA:async()=>true,buscarPorId:async()=>({id:1,username:'qa',role:'admin',status:'inactive'}),guardarRefreshToken:async()=>{},actualizarUltimoLogin:async()=>{}});
    try { await assert.rejects(()=>Auth.verificarMFA(1,'123456'),/inactivo|inactive/i); }
    finally { Object.assign(Usuario,saved); }
  });
  await test('AUTH-05', 'API traffic does not consume the separate login rate limit', async () => {
    const api=rateLimiter({maxPeticiones:1000}),login=rateLimiter({maxPeticiones:100});
    const req={ip:'isolated-qa-rate-bucket'},res=response();
    for(let i=0;i<101;i++) api(req,res,()=>{});
    let allowed=false;login(req,res,()=>{allowed=true;});
    assert.equal(allowed,true,`First login after API traffic returns ${res.statusCode}`);
  });
  const apiApp=express(); apiApp.use(express.json());
  apiApp.use('/api/reservas',require('../src/routes/reservasRoutes'));
  apiApp.use('/api/pasajeros',require('../src/routes/pasajerosRoutes'));
  apiApp.use('/api/clientes',require('../src/routes/clientesRoutes'));
  const server=await new Promise(resolve=>{const s=apiApp.listen(0,'127.0.0.1',()=>resolve(s));});
  const url=`http://127.0.0.1:${server.address().port}`;
  const token=jwt.sign({id:999,rol:'customer'},process.env.JWT_SECRET);
  const headers={Authorization:`Bearer ${token}`};
  try {
    await test('ACL-00','Unauthenticated reservation access returns 401',async()=>{
      assert.equal((await fetch(url+'/api/reservas/QA0001')).status,401);
    });
    await test('ACL-01','Customer cannot read another customer reservation',async()=>{
      queryHandler=async sql=>sql.includes('SELECT r.*') ? [[{id:7,pnr:'QA0001',customer_id:2,customer_email:'fictional@example.invalid'}]] : [[]];
      const r=await fetch(url+'/api/reservas/QA0001',{headers});assert.equal(r.status,403,`Foreign reservation HTTP ${r.status}`);
    });
    await test('ACL-02','Customer cannot enumerate passengers of another reservation',async()=>{
      queryHandler=async()=>[[{id:1,reservation_id:7,document_number:'SYNTHETIC'}]];
      const r=await fetch(url+'/api/pasajeros/reserva/7',{headers});assert.equal(r.status,403,`Foreign passengers HTTP ${r.status}`);
    });
    await test('ACL-03','Customer cannot search the complete customer directory',async()=>{
      queryHandler=async()=>[[{id:2,email:'fictional@example.invalid',document_number:'SYNTHETIC'}]];
      const r=await fetch(url+'/api/clientes/buscar?q=%25',{headers});assert.equal(r.status,403,`Customer directory HTTP ${r.status}`);
    });
    await test('ACL-04','Customer cannot list all reservations',async()=>{
      assert.equal((await fetch(url+'/api/reservas',{headers})).status,403);
    });
  } finally { await new Promise(resolve=>server.close(resolve)); }
  await test('PAY-01','Empty card number is rejected by the active payment gateway',async()=>{
    const random=Math.random;Math.random=()=>0.9;
    try { const r=await Gateway.procesarTarjeta({numero_tarjeta:'',cvv:'123',expiracion:'12/99'});assert.equal(r.exito,false,`Empty card: ${r.codigo}`); }
    finally {Math.random=random;}
  });
  await test('PAY-02','Card remains valid during the last day of its expiry month',async()=>{
    const RealDate=Date;
    global.Date=class extends RealDate {constructor(...args){super(...(args.length?args:['2026-10-31T12:00:00-06:00']));}};
    try {assert.equal(Gateway.validarExpiracion('10/26'),true);} finally {global.Date=RealDate;}
  });
  await test('PAY-03','Transfer without a bank reference is rejected before persistence',async()=>{
    const state=paymentFixture();
    let rejected=false;try {await Payment.procesarPago({reservation_id:7,method:'transfer',amount:100},{id:1});}catch(e){rejected=true;}
    assert.equal(rejected,true,`Created ${state.inserted.length} pending payment(s) without a reference`);
  });
  await test('PAY-04','Confirmation rejects an expired reservation before the expiration job runs',async()=>{
    paymentFixture({expired:true});await assert.rejects(()=>Payment.confirmarTransferencia(8,{id:1}),/venci|expir/i);
  });
  await test('OPS-01','Pilot and copilot roles from the schema permit check-in',async()=>{
    checkinFixture();const res=response();await Checkin.hacerCheckin({params:{segmentId:1}},res);
    assert.equal(res.statusCode,200,JSON.stringify(res.body));
  });
  await test('OPS-02','Partial payment does not authorize check-in with an outstanding balance',async()=>{
    // Bypass OPS-01 with its currently expected spelling to isolate the payment rule.
    checkinFixture({crew:['pilot','copiloto'],status:'confirmed'});const res=response();await Checkin.hacerCheckin({params:{segmentId:1}},res);
    assert.ok(res.statusCode>=400,`Check-in HTTP ${res.statusCode} with $99 still outstanding`);
  });
  await test('OPS-03','Seat assignment rejects seats beyond physical capacity',async()=>{
    checkinFixture({capacity:2});const res=response();await Checkin.asignarAsiento({params:{segmentId:1},body:{seat:'1F'}},res);
    assert.ok(res.statusCode>=400,`Seat 1F in a two-seat aircraft: HTTP ${res.statusCode}`);
  });
  await test('OPS-04','Closing a cancelled flight is rejected',async()=>{
    queryHandler=async sql=>sql.startsWith('SELECT gate')?[[{gate:'A1',aircraft_id:1,status:'cancelled'}]]:sql.startsWith('SELECT COUNT')?[[{n:0}]]:[{affectedRows:1}];
    const res=response();await Checkin.cerrarVuelo({params:{id:1}},res);
    assert.ok(res.statusCode>=400,`Cancelled flight changed to completed: HTTP ${res.statusCode}`);
  });
  await test('OPS-05','Inactive crew cannot be assigned to a flight',async()=>{
    queryHandler=async sql=>sql.startsWith('SELECT * FROM crew_members')?[[{id:1,active:0,role_operativo:'cabin',license_expiry:'2000-01-01'}]]:[{insertId:1}];
    const res=response();await Operations.asignarCrew({body:{flight_id:1,crew_member_id:1}},res);
    assert.ok(res.statusCode>=400,`Inactive crew assignment: HTTP ${res.statusCode}`);
  });
  await test('COM-01','Adding a service checks reservation state and passenger/flight membership',async()=>{
    let reservationChecked=false;
    queryHandler=async sql=>{
      if(sql.includes('SELECT') && sql.includes('FROM reservations')){reservationChecked=true;return [[{id:7,status:'cancelled'}]];}
      if(sql.startsWith('SELECT * FROM flight_ancillaries'))return [[{id:1,stock:2,price_override:null}]];
      if(sql.startsWith('SELECT base_price'))return [[{base_price:25}]];
      if(sql.startsWith('INSERT'))return [{insertId:1}];
      return [{affectedRows:1}];
    };
    const res=response();await Commercial.agregarAncillaryReserva({body:{reservation_id:7,passenger_id:999,flight_id:44,ancillary_id:1,quantity:1}},res);
    assert.ok(res.statusCode>=400,`Service accepted: HTTP ${res.statusCode}; reservation validated=${reservationChecked}`);
  });
  await test('LOG-01','Audit masking removes numeric CVV and document identifiers',async()=>{
    let detail;
    queryHandler=async(sql,params)=>{detail=JSON.parse(params[5]);return [{insertId:1}];};
    const res=new EventEmitter();res.statusCode=400;
    const req={method:'POST',path:'/api/pagos/procesar',originalUrl:'/api/pagos/procesar',headers:{},body:{datos_pago:{cvv:123,numero_tarjeta:4111111111111111},document_number:123456789},params:{},query:{}};
    auditarCambios(req,res,()=>{});res.emit('finish');await Promise.resolve();
    assert.ok(!JSON.stringify(detail).includes('4111111111111111'), 'Numeric PAN retained in audit details');
  });
  await test('DTE-01','A generated FE passes the project complete DTE validator',async()=>{
    dteFixture();const r=await Dte.emitirDTE({reservation_id:7,tipo_dte:'01'});
    const validation=Validators.validarDTECompleto(r.dte,'01');
    assert.equal(validation.valido,true,`Generator status=${r.estado}; ${validation.errores.join('; ')}`);
  });
  await test('DTE-02','CCFE cannot be accepted without the receiver NRC',async()=>{
    dteFixture();await assert.rejects(()=>Dte.emitirDTE({reservation_id:7,tipo_dte:'03',receptor:{nit:'06141234561010'}}),/NRC|nrc|receptor/i);
  });
  await test('DTE-03','Simultaneous invoices for different reservations receive distinct control numbers',async()=>{
    dteFixture();const base=queryHandler;const controls=new Set();let controlReads=0;
    queryHandler=async(sql,params=[])=>{
      if(sql.includes('GET_LOCK'))return [[{acquired:1}]];
      if(sql.includes('RELEASE_LOCK'))return [[{released:1}]];
      if(sql.includes('MAX(CAST(RIGHT(control_number'))return [[{n:++controlReads}]];
      if(sql.startsWith('INSERT INTO dte_headers')){
        if(controls.has(params[2]))throw new Error('ER_DUP_ENTRY: uk_control_number');
        controls.add(params[2]);
      }
      return base(sql,params);
    };
    const r=await Promise.allSettled([Dte.emitirDTE({reservation_id:7,tipo_dte:'01'}),Dte.emitirDTE({reservation_id:8,tipo_dte:'01'})]);
    assert.equal(r.filter(x=>x.status==='fulfilled').length,2,r.filter(x=>x.status==='rejected').map(x=>x.reason.message).join('; '));
  });
  await test('COM-02','The service activation toggle preserves required name/code/price fields',async()=>{
    let paramsSaved;
    queryHandler=async(sql,params)=>{paramsSaved=params;return [{affectedRows:1}];};
    const res=response();await Commercial.actualizarAncillary({params:{id:1},body:{active:false}},res);
    assert.ok(!paramsSaved.slice(0,3).includes(undefined),'UI active-only request sends undefined code/name/type into UPDATE');
  });
  await test('HTTP-01','A database failure in fiscalidad returns an HTTP error without terminating Node',async()=>{
    const {spawnSync}=require('node:child_process');
    const script=`
      const Module=require('module');const load=Module._load;
      Module._load=function(r,p,m){if(/config\\/db$/.test(r))return {query:async()=>{throw new Error('QA synthetic DB failure')}};return load.apply(this,arguments)};
      const express=require('./backend/node_modules/express');
      const c=require('./backend/src/controllers/fiscalidadController');
      const app=express();app.get('/reglas',c.listarReglas);app.use((e,q,s,n)=>s.status(500).json({error:'controlled'}));
      const server=app.listen(0,'127.0.0.1',async()=>{try {const r=await fetch('http://127.0.0.1:'+server.address().port+'/reglas');server.close(()=>process.exit(r.status===500?0:2));}catch(e){server.close(()=>process.exit(3));}});
    `;
    const child=spawnSync(process.execPath,['-e',script],{cwd:path.join(__dirname,'../..'),encoding:'utf8',timeout:10000});
    assert.equal(child.status,0,`Node exit=${child.status}; synthetic DB failure was an unhandled rejection`);
    assert.doesNotMatch(child.stderr,/UnhandledPromiseRejection|uncaughtException/i,'Synthetic SQL failure escaped the Express error middleware');
  });
  const report={date:'2026-10-12',mode:'isolated application acceptance checks; no real DB/email/payment I/O',total:results.length,
    passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
  fs.writeFileSync(path.join(__dirname,'../docs/qa-2026-10-12/acceptance-results.json'),JSON.stringify(report,null,2));
  console.log(`RESULTADO: ${report.passed} passed, ${report.failed} failed, ${report.total} total`);
  if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{Module._load=originalLoad;});
