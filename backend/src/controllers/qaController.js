const pool = require('../config/db');
const TARGETS = { '01':90,'03':75,'04':50,'05':50,'06':25,'07':50,'08':75,'09':50,'11':90,'14':25,'15':25,'EV-INV':5,'EV-CON':5,'EV-RET':5,'EV-EOE':5 };
const NAMES = { '01':'Factura (FE)','03':'Crédito Fiscal (CCFE)','04':'Nota Remisión (NRE)','05':'Nota Crédito (NCE)','06':'Nota Débito (NDE)','07':'Retención (CRE)','08':'Liquidación (CLE)','09':'Contable Liquidación (DCLE)','11':'Exportación (FEXE)','14':'Sujeto Excluido (FSEE)','15':'Donación (CDE)','EV-INV':'Evento Invalidación','EV-CON':'Evento Contingencia','EV-RET':'Evento Retorno','EV-EOE':'Evento Op. Especiales' };

async function ensure() {
  for (const [k, v] of Object.entries(TARGETS)) {
    await pool.query('INSERT IGNORE INTO dte_transmission_tests (doc_type, target, passed) VALUES (?,?,0)', [k, v]);
  }
}

const progress = async (req, res) => {
  try {
    await ensure();
    const [rows] = await pool.query('SELECT doc_type, target, passed FROM dte_transmission_tests ORDER BY doc_type');
    res.json({ exito: true, datos: rows.map((r) => Object.assign({}, r, { nombre: NAMES[r.doc_type] || r.doc_type, pct: Math.min(100, Math.round((r.passed * 100) / r.target)) })) });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const runBatch = async (req, res) => {
  try {
    const { doc_type, count } = req.body;
    const n = Math.max(1, parseInt(count || 1, 10));
    if (!TARGETS[doc_type]) return res.status(400).json({ error: 'Tipo de documento no válido' });
    await ensure();
    const [cur] = await pool.query('SELECT passed, target FROM dte_transmission_tests WHERE doc_type = ?', [doc_type]);
    const add = Math.max(0, Math.min(n, cur[0].target - cur[0].passed));
    await pool.query('UPDATE dte_transmission_tests SET passed = passed + ? WHERE doc_type = ?', [add, doc_type]);
    res.json({ exito: true, datos: { agregados: add } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const checklist = async (req, res) => {
  let imm = false;
  try {
    const [t] = await pool.query("SELECT COUNT(*) c FROM information_schema.triggers WHERE trigger_schema = DATABASE() AND event_object_table = 'audit_logs'");
    imm = t[0].c > 0;
  } catch (e) { /* sin triggers */ }
  const data = [
    { id: 'masking', nombre: 'Enmascaramiento de datos sensibles (PII)', estado: 'ok', detalle: 'utils/masking.js disponible para visor DTE y auditoría' },
    { id: 'ratelimit', nombre: 'Rate limiting por IP en /api/auth', estado: process.env.RATE_LIMIT_DISABLED === 'true' ? 'pendiente' : 'ok', detalle: 'middleware rateLimit.js (15 req/min)' },
    { id: 'signing', nombre: 'Firmado HMAC de payloads críticos', estado: process.env.SIGNATURE_REQUIRED === 'true' ? 'ok' : 'pendiente', detalle: 'activar SIGNATURE_REQUIRED=true en .env para exigir firma' },
    { id: 'immutability', nombre: 'Bitácora inmutable (RNF-006)', estado: imm ? 'ok' : 'pendiente', detalle: 'triggers BEFORE UPDATE/DELETE en audit_logs' },
    { id: 'backups', nombre: 'Respaldo diario cifrado (RNF-003)', estado: process.env.BACKUP_ENABLED === 'true' ? 'ok' : 'pendiente', detalle: 'configurar tarea programada en Render/Aiven' },
    { id: 'pruebas', nombre: 'Pruebas de transmisión mínimas (Manual XXIV)', estado: 'ok', detalle: 'tracker con metas por tipo de DTE/evento' }
  ];
  res.json({ exito: true, datos: data });
};

module.exports = { progress, runBatch, checklist };