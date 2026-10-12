const assert = require('node:assert/strict');
const { crearPayloadQrSimulado } = require('../src/services/rgPdfService');

const payload = crearPayloadQrSimulado({
  codigoGeneracion: '00000000-0000-4000-8000-000000000001',
  numeroControl: 'DTE-01-M001P001-000000000000001',
  fecEmi: '2026-10-08'
});

assert.match(payload, /DOCUMENTO TRIBUTARIO SIMULADO/);
assert.match(payload, /SIN VALIDEZ FISCAL/);
assert.match(payload, /No redirige ni consulta el portal del Ministerio de Hacienda\./);
assert.match(payload, /00000000-0000-4000-8000-000000000001/);
assert.match(payload, /DTE-01-M001P001-000000000000001/);
assert.match(payload, /2026-10-08/);
assert.doesNotMatch(payload, /https?:\/\//i);
assert.doesNotMatch(payload, /dte\.mh\.gob\.sv/i);

console.log('PASS | el QR de prueba identifica el DTE simulado y no incluye URLs de Hacienda');
