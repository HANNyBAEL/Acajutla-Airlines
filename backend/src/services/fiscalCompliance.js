const crypto = require('crypto');

const b64url = (s) => Buffer.from(s).toString('base64url');

const CAT017 = { cash: '01', transfer: '05', card: '03', cheque: '04' };

function firmar(json) {
  if (json.firmaElectronica) return json;
  const limpio = Object.assign({}, json);
  delete limpio.firmaElectronica; delete limpio.selloRecibido;
  const canonical = JSON.stringify(limpio);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(canonical);
  const sig = b64url(crypto.createHmac('sha256', 'CLAVE-SIMULADA-NEXORA').update(canonical).digest('hex'));
  json.firmaElectronica = header + '.' + payload + '.' + sig;
  return json;
}

function sellar(json, sello) {
  if (sello) json.selloRecibido = sello;
  return json;
}

const r8 = (v) => Math.round((Number(v) + Number.EPSILON) * 1e8) / 1e8;
const r2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

function normalizarRedondeo(json) {
  const camposCuerpo = ['precioUni','montoDescu','ventaNoSuj','ventaExenta','ventaGravada','noGravado','ivaPerci','totaliva','ivaRete','psv','compra','seguro','flete','reteRenta','cantidad'];
  if (Array.isArray(json.cuerpoDocumento)) {
    json.cuerpoDocumento = json.cuerpoDocumento.map((it) => {
      const n = Object.assign({}, it);
      camposCuerpo.forEach((k) => { if (n[k] !== undefined && n[k] !== null) n[k] = r8(n[k]); });
      return n;
    });
  }
  if (json.resumen) {
    const s = Object.assign({}, json.resumen);
    Object.keys(s).forEach((k) => { if (typeof s[k] === 'number') s[k] = r2(s[k]); });
    if (Array.isArray(s.tributos)) s.tributos = s.tributos.map((t) => Object.assign({}, t, { valor: r2(t.valor) }));
    if (Array.isArray(s.pagos)) s.pagos = s.pagos.map((p) => Object.assign({}, p, { montoPago: r2(p.montoPago) }));
    json.resumen = s;
  }
  return json;
}

function asegurarPagos(json, metodo) {
  if (!json.resumen) return json;
  const codigo = CAT017[metodo] || '01';
  const total = Number(json.resumen.totalPagar || 0);
  json.resumen.condicionOperacion = 1;
  json.resumen.pagos = [{ codigo: codigo, montoPago: r2(total), referencia: codigo === '01' ? null : null, plazo: null, periodo: null }];
  json.resumen.numPagoElectronico = json.resumen.numPagoElectronico || null;
  return json;
}

function asegurarFusion(json) {
  const t = String(json.identificacion && json.identificacion.tipoDte);
  if (['05','06'].includes(t) && json.identificacion && !('fusion' in json.identificacion)) json.identificacion.fusion = null;
  return json;
}

function asegurarNCE_NDE(json) {
  const t = String(json.identificacion && json.identificacion.tipoDte);
  if (!['05','06'].includes(t)) return json;
  const rel = Array.isArray(json.documentoRelacionado) && json.documentoRelacionado[0] ? json.documentoRelacionado[0].numeroDocumento : null;
  if (Array.isArray(json.cuerpoDocumento)) {
    json.cuerpoDocumento = json.cuerpoDocumento.map((it) => Object.assign({
      ivaPerci: 0, totaliva: 0, ivaRete: 0, numeroDocumento: it.numeroDocumento || rel, cantidad: it.cantidad || 1
    }, it, {
      ivaPerci: it.ivaPerci || 0, totaliva: it.totaliva || 0, ivaRete: it.ivaRete || 0,
      numeroDocumento: it.numeroDocumento || rel, cantidad: it.cantidad || 1
    }));
  }
  const s = json.resumen || {};
  const sum = (k) => (Array.isArray(json.cuerpoDocumento) ? json.cuerpoDocumento.reduce((a, it) => a + Number(it[k] || 0), 0) : 0);
  const ivaPerciT = r2(sum('ivaPerci')); const ivaReteT = r2(sum('ivaRete')); const iva13 = r2(sum('totaliva'));
  const tributosValor = Array.isArray(s.tributos) ? s.tributos.reduce((a, t) => a + Number(t.valor || 0), 0) : 0;
  const subTotalVentas = Number(s.subTotalVentas || 0);
  const noGrav = Number(s.totalNoGravado || 0);
  s.ivaPerci = ivaPerciT; s.codigoRetencionMH = s.codigoRetencionMH || null; s.ivaRete = ivaReteT; s.totalIva = iva13;
  s.montoTotalOperacion = r2(subTotalVentas + tributosValor);
  s.totalPagar = r2(Math.max(0, s.montoTotalOperacion + ivaPerciT - ivaReteT + noGrav));
  json.resumen = s;
  return json;
}

function addMonths(d, m) { const x = new Date(d); x.setMonth(x.getMonth() + m); return x; }
function businessDay10(dSello) {
  const base = new Date(dSello); base.setMonth(base.getMonth() + 1); base.setDate(1);
  let count = 0; const x = new Date(base);
  while (count < 10) { const day = x.getDay(); if (day !== 0 && day !== 6) count++; if (count < 10) x.setDate(x.getDate() + 1); }
  x.setHours(23, 59, 59, 999); return x;
}

function validarPlazoInvalidacion(jsonDTE, fechaEvento, now, selloFecha) {
  const t = String(jsonDTE.identificacion.tipoDte);
  const fec = new Date(jsonDTE.identificacion.fecEmi);
  const ev = new Date(fechaEvento);
  const nowD = new Date(now);
  const sello = new Date(selloFecha || now);
  if (['01','11','14'].includes(t)) {
    if (ev < fec) return { ok: false, mensaje: 'La fecha del evento no puede anteceder la fecha de generación del DTE.' };
    if (ev > addMonths(fec, 3)) return { ok: false, mensaje: 'FE/FEXE/FSEE: la fecha del evento excede 3 meses posteriores a la fecha de generación.' };
    if (nowD > addMonths(sello, 3)) return { ok: false, mensaje: 'FE/FEXE/FSEE: la transmisión excede 3 meses desde el Sello de Recepción.' };
    return { ok: true, mensaje: 'Dentro del plazo de 3 meses (FE/FEXE/FSEE).' };
  }
  if (ev.toDateString() !== fec.toDateString()) return { ok: false, mensaje: 'Para este tipo de DTE la fecha del evento debe ser igual a la fecha de generación.' };
  if (nowD > businessDay10(sello)) return { ok: false, mensaje: 'Transmisión fuera de los 10 días hábiles del mes siguiente al sello.' };
  return { ok: true, mensaje: 'Dentro del plazo de 10 días hábiles del mes siguiente.' };
}

function validarRetorno(dtes, montoTotal, now) {
  if (!dtes.length || dtes.length > 50) return { ok: false, mensaje: 'Debe relacionar entre 1 y 50 DTE.' };
  const tipos = new Set(dtes.map((d) => String(d.identificacion.tipoDte)));
  if (tipos.size !== 1 || !['01','11','14'].has ? false : !['01','11','14'].includes([...tipos][0])) return { ok: false, mensaje: 'Solo FE (01), FEXE (11) o FSEE (14), y todos del mismo tipo.' };
  for (const d of dtes) {
    if (!d.selloRecibido && !d._sello) return { ok: false, mensaje: 'Todos los DTE relacionados deben tener Sello de Recepción.' };
    const sello = new Date(d._selloFecha || d.identificacion.fecEmi);
    if (new Date(now) > addMonths(sello, 3)) return { ok: false, mensaje: 'Evento fuera del plazo de 3 meses desde el sello de un DTE relacionado.' };
  }
  const emisor = dtes[0].emisor.nit; const rec = JSON.stringify(dtes[0].receptor);
  for (const d of dtes) { if (d.emisor.nit !== emisor || JSON.stringify(d.receptor) !== rec) return { ok: false, mensaje: 'Todos los DTE deben compartir emisor y receptor.' }; }
  return { ok: true, mensaje: 'Validaciones de Evento de Retorno OK.' };
}

module.exports = { firmar, sellar, normalizarRedondeo, asegurarPagos, asegurarFusion, asegurarNCE_NDE, validarPlazoInvalidacion, validarRetorno, r2, r8 };