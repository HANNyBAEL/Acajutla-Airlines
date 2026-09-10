const BASE = process.env.API_URL || 'http://localhost:3000/api';
const USER = process.env.TEST_USER || 'admin';
const PASS = process.env.TEST_PASS || 'Admin123';
let token = '';
const results = [];
async function call(method, path, body) {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, ok: res.ok, data: await res.json().catch(() => null) };
  } catch (e) { return { status: 0, ok: false, data: null }; }
}
async function test(id, nombre, fn) {
  const r = await fn();
  results.push({ id, nombre, status: r.status, pass: r.ok });
  console.log((r.ok ? 'PASS' : 'FAIL') + ' | ' + id + ' | ' + nombre + ' | HTTP ' + r.status);
}
(async () => {
  console.log('=== SMOKE TEST SKYMANAGER ===');
  await test('PF-01', 'Login admin', async () => {
    const r = await call('POST', '/auth/login', { usuario: USER, password: PASS });
    if (r.data && r.data.datos && r.data.datos.accessToken) token = r.data.datos.accessToken;
    if (r.data && r.data.requiereMFA) return { status: 200, ok: true };
    return r;
  });
  await test('PS-01', 'Sin token => 401', async () => { const t = token; token = ''; const r = await call('GET', '/reservas'); token = t; return { status: r.status, ok: r.status === 401 }; });
  await test('PF-07', 'Listar vuelos', () => call('GET', '/vuelos'));
  await test('PF-04', 'Listar reservas', () => call('GET', '/reservas'));
  await test('PF-11', 'Listar pagos', () => call('GET', '/pagos'));
  await test('PF-14', 'Listar DTE', () => call('GET', '/dte'));
  await test('PF-17', 'Listar notas', () => call('GET', '/notas'));
  await test('PF-19', 'Contingencia pendientes', () => call('GET', '/dte-eventos/pendientes'));
  await test('PF-25', 'Waitlist', () => call('GET', '/comercial/waitlist'));
  await test('PF-23', 'Tripulacion', () => call('GET', '/operaciones/tripulacion'));
  await test('PS-04', 'Auditoria', () => call('GET', '/auditoria'));
  await test('PI-01', 'Dashboard reportes', () => call('GET', '/reportes/dashboard'));
  await test('PF-27', 'Correos outbox', () => call('GET', '/correos'));
  await test('XXIV', 'Tracker pruebas MH', () => call('GET', '/qa/pruebas'));
  const pass = results.filter((r) => r.pass).length;
  console.log('=== RESULTADO: ' + pass + '/' + results.length + ' PASS ===');
  process.exit(pass === results.length ? 0 : 1);
})();