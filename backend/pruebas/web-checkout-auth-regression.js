const assert = require('node:assert/strict');
const { autenticarCheckoutWeb } = require('../src/middleware/webCheckoutAuth');

const llamar = (token) => {
  let status = 200;
  let body = null;
  let continuado = false;
  const req = { headers: token === undefined ? {} : { 'x-web-checkout-secret': token } };
  const res = {
    status(code) { status = code; return this; },
    json(value) { body = value; return this; }
  };
  autenticarCheckoutWeb(req, res, () => { continuado = true; });
  return { status, body, continuado };
};

const anterior = process.env.WEB_CHECKOUT_SHARED_SECRET;
try {
  delete process.env.WEB_CHECKOUT_SHARED_SECRET;
  assert.equal(llamar('x'.repeat(64)).status, 503);
  assert.equal(llamar('x'.repeat(64)).continuado, false);

  process.env.WEB_CHECKOUT_SHARED_SECRET = 'a'.repeat(64);
  assert.equal(llamar('b'.repeat(64)).status, 401);
  assert.equal(llamar('a'.repeat(64)).continuado, true);
  console.log('PASS | checkout interno requiere secreto configurado y válido');
} finally {
  if (anterior === undefined) delete process.env.WEB_CHECKOUT_SHARED_SECRET;
  else process.env.WEB_CHECKOUT_SHARED_SECRET = anterior;
}
