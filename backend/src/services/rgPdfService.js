const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const CAT016 = { '1': 'Contado', '2': 'A crédito', '3': 'Otro' };
const CAT022 = { '13': 'DUI', '36': 'NIT', '3': 'Pasaporte', '2': 'Carnet de Residente', '37': 'Otro' };
const UNIDADES = { '1': 'metro', '23': 'Litro', '34': 'Kilogramo', '59': 'Unidad', '99': 'Otra' };

const fmt = (v) => '$' + Number(v || 0).toFixed(2);
const dsh = (v) => (v === null || v === undefined || v === '' ? '-' : v);

function numeroALetras(num) {
  const UN = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const DEC = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const cent = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    if (n < 30) return UN[n];
    const c = Math.floor(n / 100), d = n % 100;
    if (d === 0) return CEN[c];
    let s = CEN[c] ? CEN[c] + ' ' : '';
    if (d < 30) s += UN[d];
    else { const dd = Math.floor(d / 10), u = d % 10; s += DEC[dd] + (u ? ' Y ' + UN[u] : ''); }
    return s.trim();
  };
  const miles = (n) => {
    if (n === 0) return '';
    if (n < 1000) return cent(n);
    const k = Math.floor(n / 1000), r = n % 1000;
    const kk = k === 1 ? 'MIL' : cent(k) + ' MIL';
    return (kk + (r ? ' ' + cent(r) : '')).trim();
  };
  const millon = (n) => {
    if (n < 1000000) return miles(n);
    const m = Math.floor(n / 1000000), r = n % 1000000;
    const mm = m === 1 ? 'UN MILLÓN' : miles(m) + ' MILLONES';
    return (mm + (r ? ' ' + miles(r) : '')).trim();
  };
  const enteros = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - enteros) * 100);
  return (enteros === 0 ? 'CERO' : millon(enteros)) + ' DÓLARES CON ' + String(centavos).padStart(2, '0') + '/100';
}

async function generarPDF(header) {
  const dte = typeof header.full_json === 'string' ? JSON.parse(header.full_json) : (header.full_json || {});
  const id = dte.identificacion || {};
  const emisor = dte.emisor || {};
  const receptor = dte.receptor || {};
  const cuerpo = dte.cuerpoDocumento || [];
  const resumen = dte.resumen || {};
  const esFE = String(id.tipoDte) === '01';
  const nombreTipo = esFE ? 'FACTURA' : (String(id.tipoDte) === '03' ? 'COMPROBANTE DE CRÉDITO FISCAL' : 'DOCUMENTO TRIBUTARIO');
  const ver = 'Ver. ' + (id.version || (esFE ? 2 : 4));
  const sello = header.reception_seal || dte.selloRecibido || null;

  const qrPayload = 'https://dte.mh.gob.sv/consultapublicaconsumidor/?codigoGeneracion=' + (id.codigoGeneracion || '') + '&fechaEmision=' + (id.fecEmi || '');
  const qrBuffer = await QRCode.toBuffer(qrPayload, { errorCorrectionLevel: 'M', margin: 1, width: 400 });

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const M = 40;
  const CW = 595.28 - M * 2;
  const GAP = 12;
  const LINE = 11;

  const kv = (x, y, label, value, w) => {
    const lt = label + ': ';
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#000');
    doc.text(lt, x, y, { lineBreak: false, width: w });
    const lw = doc.widthOfString(lt);
    doc.font('Helvetica').fontSize(7).fillColor('#000');
    doc.text(String(dsh(value)), x + lw, y, { width: w - lw, lineBreak: false });
    return y + LINE;
  };
  const box = (y, h) => { doc.rect(M, y, CW, h).stroke('#333'); };
  const halfBox = (x, y, w, h, title) => {
    doc.rect(x, y, w, h).stroke('#333');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#000').text(title, x, y + 4, { width: w, align: 'center', lineBreak: false });
  };

  let y = 40;
  doc.font('Helvetica').fontSize(7).fillColor('#000').text(ver, M + CW - 50, 24, { width: 50, align: 'right', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(12).text('DOCUMENTO TRIBUTARIO ELECTRÓNICO', M, y, { width: CW, align: 'center', lineBreak: false });
  y += 16;
  doc.font('Helvetica-Bold').fontSize(11).text(nombreTipo, M, y, { width: CW, align: 'center', lineBreak: false });
  y += 20;

  box(y, 64);
  const colW = CW / 2 - 74;
  let y1 = y + 10;
  y1 = kv(M + 6, y1, 'Código de Generación', id.codigoGeneracion, colW);
  y1 = kv(M + 6, y1, 'Número de Control', id.numeroControl, colW);
  doc.image(qrBuffer, M + CW / 2 - 25, y + 7, { width: 50, height: 50 });
  let y2 = y + 10;
  y2 = kv(M + CW / 2 + 34, y2, 'Modelo de Facturación', id.tipoModelo === 2 ? '2 - Diferido' : '1 - Previo', colW);
  y2 = kv(M + CW / 2 + 34, y2, 'Tipo de Transmisión', id.tipoOperacion === 2 ? '2 - Contingencia' : '1 - Normal', colW);
  y2 = kv(M + CW / 2 + 34, y2, 'Fecha y Hora de Generación', (id.fecEmi || '-') + ' ' + (id.horEmi || ''), colW);
  y += 64 + GAP;

  box(y, 24);
  kv(M + 6, y + 7, 'Sello de Recepción', sello || (header.transmission_status === 'contingency' ? 'PENDIENTE (CONTINGENCIA)' : null), CW - 12);
  y += 24 + GAP;

  const hw = (CW - 8) / 2;
  const hER = 118;
  halfBox(M, y, hw, hER, 'EMISOR');
  halfBox(M + hw + 8, y, hw, hER, 'RECEPTOR');
  const ew = hw - 12;
  let e1 = y + 18;
  e1 = kv(M + 6, e1, 'Nombre', emisor.nombre, ew);
  e1 = kv(M + 6, e1, 'NIT', emisor.nit, ew);
  e1 = kv(M + 6, e1, 'NRC', emisor.nrc, ew);
  e1 = kv(M + 6, e1, 'Actividad económica', (emisor.codActividad || '') + ' ' + (emisor.descActividad || ''), ew);
  e1 = kv(M + 6, e1, 'Dirección', emisor.direccion ? emisor.direccion.complemento : null, ew);
  e1 = kv(M + 6, e1, 'Teléfono', emisor.telefono, ew);
  e1 = kv(M + 6, e1, 'Correo electrónico', emisor.correo, ew);
  kv(M + 6, e1, 'Nombre Comercial', emisor.nombreComercial, ew);
  const rx = M + hw + 8;
  let r1 = y + 18;
  r1 = kv(rx + 6, r1, 'Nombre', receptor.nombre, ew);
  r1 = kv(rx + 6, r1, 'Tipo de doc. de Identificación', CAT022[receptor.tipoDocumento] || dsh(receptor.tipoDocumento), ew);
  r1 = kv(rx + 6, r1, 'N° de doc. de Identificación', receptor.numDocumento, ew);
  if (!esFE) r1 = kv(rx + 6, r1, 'NIT', receptor.nit, ew);
  r1 = kv(rx + 6, r1, 'NRC', receptor.nrc, ew);
  r1 = kv(rx + 6, r1, 'Actividad económica', receptor.descActividad, ew);
  r1 = kv(rx + 6, r1, 'Dirección', receptor.direccion ? receptor.direccion.complemento : null, ew);
  r1 = kv(rx + 6, r1, 'Teléfono', receptor.telefono, ew);
  kv(rx + 6, r1, 'Correo electrónico', receptor.correo, ew);
  y += hER + GAP;

  box(y, 24);
  const vt = dte.ventaTercero;
  kv(M + 6, y + 7, 'NIT', vt ? vt.nit : null, CW / 2 - 20);
  kv(M + CW / 2 + 10, y + 7, 'Nombre del Tercero', vt ? vt.nombre : null, CW / 2 - 16);
  y += 24 + GAP;

  box(y, 24);
  const rel = dte.documentoRelacionado;
  const relArr = Array.isArray(rel) ? rel : (rel ? [rel] : []);
  kv(M + 6, y + 7, 'Tipo de Documento', relArr.length ? relArr.map((r) => r.tipoDocumento).join(', ') : null, CW / 3 - 12);
  kv(M + CW / 3 + 8, y + 7, 'N° de documento', relArr.length ? relArr.map((r) => r.numeroDocumento).join(', ') : null, CW / 3 - 12);
  kv(M + (2 * CW) / 3 + 8, y + 7, 'Fecha de documento', relArr.length ? relArr.map((r) => r.fechaEmision).join(', ') : null, CW / 3 - 14);
  y += 24 + GAP;

  box(y, 24);
  const oa = dte.otrosDocumentos;
  const oaArr = Array.isArray(oa) ? oa : (oa ? [oa] : []);
  kv(M + 6, y + 7, 'Identificación del documento', oaArr.length ? oaArr.map((o) => o.descDocumento).join(', ') : null, CW / 2 - 20);
  kv(M + CW / 2 + 10, y + 7, 'Descripción', oaArr.length ? oaArr.map((o) => o.detalleDocumento).join(', ') : null, CW / 2 - 16);
  y += 24 + GAP;

  if (y > 640) { doc.addPage(); y = M; }
  const cols = [
    { t: 'N°', w: 18 }, { t: 'Cantidad', w: 40 }, { t: 'Unidad', w: 34 }, { t: 'Código', w: 40 },
    { t: 'Descripción', w: 150 }, { t: 'Precio Unitario', w: 52 }, { t: 'Descuento por ítem', w: 46 },
    { t: 'Otros Montos No Afectos', w: 46 }, { t: 'Ventas No Sujetas', w: 42 }, { t: 'Ventas Exentas', w: 42 }, { t: 'Ventas Gravadas', w: 45 }
  ];
  doc.rect(M, y, CW, 20).fill('#e8e8e8');
  let x = M;
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(6.2);
  cols.forEach((c) => { doc.text(c.t, x + 2, y + 7, { width: c.w - 4, align: 'center', lineBreak: false }); x += c.w; });
  doc.rect(M, y, CW, 20).stroke('#333');
  y += 20;
  doc.font('Helvetica').fontSize(6.2).fillColor('#000');
  cuerpo.forEach((it, i) => {
    const desc = String(it.descripcion || '');
    const lines = Math.max(1, Math.ceil(doc.widthOfString(desc) / (cols[4].w - 6)));
    const rh = Math.max(14, lines * 8 + 6);
    let xx = M;
    const vals = [i + 1, it.cantidad, UNIDADES[String(it.uniMedida)] || it.uniMedida, dsh(it.codigo), desc, fmt(it.precioUni), fmt(it.montoDescu), fmt(it.noGravado), fmt(it.ventaNoSuj), fmt(it.ventaExenta), fmt(it.ventaGravada)];
    cols.forEach((c, ci) => { doc.text(String(vals[ci] == null ? '-' : vals[ci]), xx + 2, y + 4, { width: c.w - 4, align: ci === 4 ? 'left' : 'center' }); xx += c.w; });
    doc.rect(M, y, CW, rh).stroke('#999');
    y += rh;
  });
  y += GAP;

  const rows = [];
  const sumaVentas = Number(resumen.totalNoSuj || 0) + Number(resumen.totalExenta || 0) + Number(resumen.totalGravada || 0);
  rows.push(['Suma de Ventas', fmt(sumaVentas)]);
  rows.push([esFE ? 'Sumatoria de ventas' : 'Suma Total de Operaciones', fmt(resumen.subTotalVentas)]);
  rows.push(['Descuento global a ventas no sujetas', fmt(resumen.descuNoSuj)]);
  rows.push(['Descuento global a ventas exentas', fmt(resumen.descuExenta)]);
  rows.push(['Descuento global a ventas gravadas', fmt(resumen.descuGravada)]);
  const trib = resumen.tributos || [];
  if (trib.length) trib.forEach((t) => rows.push([t.descripcion || ('Tributo ' + t.codigo), fmt(t.valor)]));
  else rows.push(['Nombre del Tributo', null]);
  rows.push(['Sub-Total', fmt(resumen.subTotal)]);
  if (!esFE) rows.push(['IVA Percibido', fmt(resumen.ivaPerci)]);
  rows.push(['IVA Retenido', fmt(resumen.ivaRete)]);
  rows.push(['Monto Total de la Operación', fmt(resumen.montoTotalOperacion)]);
  rows.push(['Total Otros Montos No Afectos', fmt(resumen.totalNoGravado)]);
  rows.push(['Total a Pagar', fmt(resumen.totalPagar)]);
  const labelW = 230, valueW = 95;
  const x0 = M + CW - labelW - valueW;
  if (y + rows.length * 13 > 780) { doc.addPage(); y = M; }
  rows.forEach((r) => {
    doc.rect(x0, y, labelW, 13).stroke('#999');
    doc.rect(x0 + labelW, y, valueW, 13).stroke('#999');
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#000').text(String(r[0]), x0 + 4, y + 3.5, { width: labelW - 8, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(6.5).text(String(dsh(r[1])), x0 + labelW + 4, y + 3.5, { width: valueW - 8, align: 'right', lineBreak: false });
    y += 13;
  });
  y += GAP;

  const hF = 40;
  if (y + hF > 790) { doc.addPage(); y = M; }
  box(y, hF);
  kv(M + 6, y + 6, 'Valor en Letras', resumen.totalLetras || numeroALetras(resumen.totalPagar), CW * 0.58);
  kv(M + CW * 0.62, y + 6, 'Condición de la Operación', CAT016[String(resumen.condicionOperacion)] || resumen.condicionOperacion, CW * 0.36);
  kv(M + 6, y + 6 + LINE, 'Observaciones', resumen.observaciones, CW * 0.58);
  y += hF + GAP;

  doc.font('Helvetica').fontSize(7).fillColor('#000').text('Página 1 de 1', M, 788, { width: CW, align: 'center', lineBreak: false });
  doc.font('Helvetica').fontSize(6.5).fillColor('#444').text('Nota: El campo "Tipo de doc. de Identificación" será dinámico, es decir de acuerdo al tipo de documento seleccionado por la persona que está realizando el DTE así aparecerá en la Versión Legible. Ejemplo, si se seleccionó el tipo de documento pasaporte, aparecerá la palabra pasaporte y el número de documento respectivo a la par.', M, 798, { width: CW, align: 'center' });

  return doc;
}

module.exports = { generarPDF: generarPDF, numeroALetras: numeroALetras };