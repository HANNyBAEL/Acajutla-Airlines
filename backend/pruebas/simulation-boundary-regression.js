const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validarDestinoHttp, SIMULATION } = require('../src/config/simulation');

assert.equal(SIMULATION.ambiente, '00');
assert.equal(SIMULATION.simulado, true);
assert.throws(() => validarDestinoHttp('https://example.invalid/fiscal'), /SIMULATION_NETWORK_BLOCKED/);
assert.doesNotThrow(() => validarDestinoHttp('https://api.brevo.com/v3/smtp/email'));

const roots = [path.resolve(__dirname, '../src'), path.resolve(__dirname, '../../frontend-backoffice/src'), path.resolve(__dirname, '../../Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main')];
const forbidden = /https?:\/\/[^\s"'<>]*(?:mh\.gob|hacienda\.gob|factura\.gob)/i;
function visit(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !['node_modules', 'dist', 'vendor'].includes(entry.name)) return visit(full);
    if (entry.isFile() && /\.(js|jsx|php|html|css)$/.test(entry.name)) return [full];
    return [];
  });
}
for (const file of roots.flatMap(visit)) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, forbidden, `Destino fiscal externo encontrado en ${file}`);
}
console.log('PASS | límite de simulación: ambiente 00 y ningún destino fiscal externo');
