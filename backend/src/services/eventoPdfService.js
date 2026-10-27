const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { numeroALetras } = require('./rgPdfService');

const TIPOS_DTE = {
  '01': 'Factura Electrónica (FE)',
  '03': 'Comprobante de Crédito Fiscal (CCFE)',
  '04': 'Nota de Remisión Electrónica (NRE)',
  '05': 'Nota de Crédito Electrónica (NCE)',
  '06': 'Nota de Débito Electrónica (NDE)',
  '07': 'Comprobante de Retención Electrónico (CRE)',
  '08': 'Comprobante de Liquidación Electrónico (CLE)',
  '09': 'Documento Contable de Liquidación Electrónico (DCLE)',
  '11': 'Factura de Exportación Electrónica (FEXE)',
  '14': 'Factura de Sujeto Excluido Electrónica (FSEE)',
  '15': 'Comprobante de Donación Electrónico (CDE)'
};
const DOC_PERSONA = { '13': 'DUI', '36': 'NIT', '3': 'Pasaporte', '2': 'Carnet de Residente', '37': 'Otro' };
const TIPOS_INVALIDACION = {
  1: 'Error en la información del DTE',
  2: 'Rescindir de la operación realizada',
  3: 'Otro'
};
const UNIDADES = { '1': 'metro', '23': 'Litro', '34': 'Kilogramo', '59': 'Unidad', '99': 'Otra' };
const LEFT = 31;
const CONTENT = 533;
const BOTTOM = 787;

const val = (value) => (value === undefined || value === null || value === '' ? '—' : String(value));
const moneda = (value) => '$' + Number(value || 0).toFixed(2);
const tipoDte = (code) => TIPOS_DTE[String(code).padStart(2, '0')] || ('DTE ' + val(code));
const fecha = (value) => {
  if (!value) return '—';
  const text = String(value);
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : text;
};

function marco(doc, pagina, textoPagina = 'Página ' + pagina) {
  doc.roundedRect(17, 17, 561, 807, 18).lineWidth(0.65).stroke('#a8a8a8');
  doc.font('Helvetica').fontSize(6).fillColor('#555')
    .text('REPRESENTACIÓN GRÁFICA DE EVENTO SIMULADO · SIN VALIDEZ FISCAL', LEFT, 804, { width: 390, lineBreak: false });
  doc.text(textoPagina, LEFT + CONTENT - 80, 804, { width: 80, align: 'right', lineBreak: false });
  doc.fillColor('#000');
}

function texto(doc, content, x, y, width, options = {}) {
  doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.size || 7).fillColor(options.color || '#111');
  doc.text(val(content), x, y, {
    width,
    height: options.height,
    align: options.align || 'left',
    lineBreak: options.lineBreak !== false,
    ellipsis: options.ellipsis || false
  });
}

function campo(doc, label, value, x, y, width, options = {}) {
  texto(doc, label, x, y, width, { bold: true, size: options.labelSize || 6.2, lineBreak: false });
  texto(doc, value, x, y + (options.offset || 9), width, {
    size: options.size || 7,
    height: options.height || 18,
    ellipsis: true
  });
}

function cajaIdentidad(doc, x, y, width, height, title, rows) {
  doc.roundedRect(x, y, width, height, 9).lineWidth(0.6).stroke('#999');
  texto(doc, title, x, y - 10, width, { bold: true, size: 7.1, align: 'center', lineBreak: false });
  const inset = 7;
  const rowHeight = (height - 13) / Math.max(rows.length, 1);
  rows.forEach((row, i) => {
    const yy = y + 5 + i * rowHeight;
    texto(doc, row.label + ':', x + inset, yy, row.width || width - inset * 2, { size: 6.1, lineBreak: false });
    const labelWidth = Math.min(doc.widthOfString(row.label + ':') + 4, (row.width || width - inset * 2) * 0.48);
    texto(doc, row.value, x + inset + labelWidth, yy, (row.width || width - inset * 2) - labelWidth, { size: 6.5, height: rowHeight, ellipsis: true });
  });
}

function encabezadoRetorno(doc, evento, qrBuffer, continuation = false) {
  const id = evento.identificacion || {};
  texto(doc, continuation ? 'EVENTO DE RETORNO (CONTINUACIÓN)' : 'EVENTO DE RETORNO', LEFT, 29, CONTENT, { bold: true, size: 10, align: 'center', lineBreak: false });
  if (!continuation && qrBuffer) doc.image(qrBuffer, LEFT + CONTENT / 2 - 18, 45, { width: 36, height: 36 });
  const y = continuation ? 60 : 94;
  campo(doc, 'Código de Generación', id.codigoGeneracion, LEFT + 2, y, 245);
  campo(doc, 'Sello de Recepción', evento.selloRecibido, LEFT + 2, y + 17, 245);
  campo(doc, 'Modelo de Facturación', id.tipoModelo === 2 ? '2 - Diferido' : '1 - Previo', LEFT + 280, y, 245);
  campo(doc, 'Tipo de Transmisión', id.tipoOperacion === 2 ? '2 - Contingencia' : '1 - Normal', LEFT + 280, y + 17, 245);
  campo(doc, 'Fecha y Hora del evento', (id.fecCEmi || id.fechaEvento || '—') + ' ' + (id.horEmi || id.horaEvento || ''), LEFT + 280, y + 34, 245);
  return continuation ? 128 : 148;
}

function encabezadoInvalidacion(doc, evento, sello, pagina) {
  const id = evento.identificacion || {};
  marco(doc, pagina, 'Página 1 de 1');
  texto(doc, 'Ver. 3', LEFT + CONTENT - 40, 26, 38, { size: 6.5, align: 'right', lineBreak: false });
  texto(doc, 'EVENTO DE INVALIDACIÓN', LEFT, 38, CONTENT, { bold: true, size: 11, align: 'center', lineBreak: false });
  campo(doc, 'Código de Generación', id.codigoGeneracion, LEFT + 5, 76, CONTENT - 10);
  campo(doc, 'Fecha y Hora del evento', (id.fecCEmi || '—') + ' ' + (id.horEmi || ''), LEFT + 5, 97, CONTENT - 10);
  campo(doc, 'Sello de Recepción', sello || evento.selloRecibido, LEFT + 5, 118, CONTENT - 10);
  return 151;
}

function seccion(doc, title, x, y, width) {
  texto(doc, title, x, y, width, { bold: true, size: 7, align: 'center', lineBreak: false });
}

function anchoTabla(columns) {
  const sum = columns.reduce((s, c) => s + c.width, 0);
  if (Math.abs(sum - CONTENT) > 1) throw new Error('Las columnas de representación deben sumar ' + CONTENT + ' puntos (actual ' + sum + ')');
}

function cabeceraTabla(doc, columns, x, y, options = {}) {
  const height = options.height || 26;
  let px = x;
  doc.save().fillColor('#f3f4f6').rect(x, y, CONTENT, height).fill().restore();
  doc.font('Helvetica-Bold').fontSize(options.fontSize || 5.5).fillColor('#111');
  columns.forEach((col) => {
    doc.rect(px, y, col.width, height).lineWidth(0.45).stroke('#999');
    doc.text(col.label, px + 2, y + 3, { width: col.width - 4, height: height - 5, align: 'center', valign: 'center', ellipsis: true });
    px += col.width;
  });
  return y + height;
}

function alturaFila(doc, columns, row, fontSize = 5.7) {
  let h = 13;
  doc.font('Helvetica').fontSize(fontSize);
  columns.forEach((col) => {
    const content = val(row[col.key]);
    const measured = doc.heightOfString(content, { width: Math.max(8, col.width - 5), fontSize, lineGap: 0 });
    h = Math.max(h, Math.min(38, measured + 5));
  });
  return h;
}

function filaTabla(doc, columns, row, x, y, options = {}) {
  const fontSize = options.fontSize || 5.7;
  const height = alturaFila(doc, columns, row, fontSize);
  let px = x;
  columns.forEach((col) => {
    doc.rect(px, y, col.width, height).lineWidth(0.35).stroke('#aaa');
    const raw = row[col.key];
    const content = col.format ? col.format(raw, row) : val(raw);
    texto(doc, content, px + 2, y + 2, col.width - 4, { size: fontSize, height: height - 3, align: col.align || 'center', ellipsis: true });
    px += col.width;
  });
  return y + height;
}

function camposTerceros(evento) {
  const venta = evento.ventaTercero;
  return [{ title: 'VENTA POR CUENTA DE TERCEROS', leftLabel: 'NIT', leftValue: venta?.nit, rightLabel: 'Nombre del Tercero', rightValue: venta?.nombre }];
}

function columnasRelacionados() {
  return [
    { key: 'tipoDocumento', label: 'Tipo de Documento', width: 145, format: (v) => tipoDte(v) },
    { key: 'numeroDocumento', label: 'N° de Documento / Código de Generación', width: 255 },
    { key: 'fechaGeneracion', label: 'Fecha de Documento', width: 133, format: fecha }
  ];
}

function columnasCuerpo() {
  return [
    { key: 'numItem', label: 'N°', width: 18 },
    { key: 'numeroDocumento', label: 'Código de Generación del DTE', width: 72 },
    { key: 'ivaRete', label: 'IVA Retenido', width: 35, format: moneda },
    { key: 'cantidad', label: 'Cantidad', width: 30 },
    { key: 'codigo', label: 'Código', width: 28 },
    { key: 'descripcion', label: 'Descripción', width: 85, align: 'left' },
    { key: 'uniMedida', label: 'Unidad', width: 30, format: (v) => UNIDADES[String(v)] || val(v) },
    { key: 'precioUni', label: 'Precio Unitario', width: 40, format: moneda },
    { key: 'montoDescu', label: 'Descuento por ítem', width: 38, format: moneda },
    { key: 'noGravado', label: 'Otros Montos no Afectos', width: 45, format: moneda },
    { key: 'ventaNoSuj', label: 'Ventas No Sujetas', width: 38, format: moneda },
    { key: 'ventaExenta', label: 'Ventas Exentas', width: 35, format: moneda },
    { key: 'ventaGravada', label: 'Ventas Gravadas', width: 39, format: moneda }
  ];
}

function resumenRetorno(resumen) {
  const tributos = Array.isArray(resumen.tributos) ? resumen.tributos : [];
  const sumaVentas = Number(resumen.totalNoSuj || 0) + Number(resumen.totalExenta || 0) + Number(resumen.totalGravada || 0);
  const filas = [
    ['Suma de Ventas', moneda(sumaVentas)],
    ['Suma de operaciones', moneda(resumen.subTotalVentas)]
  ];
  filas.push([tributos.map((t) => t.descripcion).filter(Boolean).join(', ') || 'Nombre del Tributo', moneda(tributos.reduce((sum, t) => sum + Number(t.valor || 0), 0))]);
  filas.push(['Total IVA Retenido', moneda(resumen.ivaRete)]);
  filas.push(['Monto Total de la Operación', moneda(resumen.montoTotalOperacion)]);
  filas.push(['Total Otros Montos no Afectos', moneda(resumen.totalNoGravado)]);
  filas.push(['Total a pagar', moneda(resumen.totalPagar)]);
  return filas;
}

async function crearQrEvento(evento, tipo) {
  const id = evento.identificacion || {};
  const payload = [
    'EVENTO DTE SIMULADO', 'SIN VALIDEZ FISCAL', 'No consulta el portal del Ministerio de Hacienda.',
    'Tipo: ' + tipo, 'Código de generación: ' + val(id.codigoGeneracion),
    'Sello de recepción: ' + val(evento.selloRecibido), 'Fecha: ' + val(id.fecCEmi || id.fechaEvento)
  ].join('\n');
  return QRCode.toBuffer(payload, { errorCorrectionLevel: 'M', margin: 1, width: 240 });
}

async function generarEventoRetornoPDF(evento) {
  const tipo = String(evento.documentosRelacionados?.[0]?.tipoDocumento || '01').padStart(2, '0');
  if (tipo !== '01' || (evento.documentosRelacionados || []).some((d) => String(d.tipoDocumento).padStart(2, '0') !== '01')) {
    throw new Error('La representación de Evento de Retorno solo está disponible para FE');
  }
  const qr = await crearQrEvento(evento, 'RETORNO');
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: false });
  let pagina = 1;
  let y = 137;
  marco(doc, pagina);
  y = encabezadoRetorno(doc, evento, qr);

  if (pagina === 1) {
    const emisor = evento.emisor || {};
    const receptor = evento.receptor || {};
    cajaIdentidad(doc, LEFT, y + 13, 260, 68, 'Emisor', [
      { label: 'Nombre', value: emisor.nombre }, { label: 'NIT', value: emisor.nit },
      { label: 'Recinto Fiscal', value: emisor.recintoFiscal },
      { label: 'Tipo de Régimen / Exportación', value: [emisor.tipoRegimen, emisor.regimenExportacion].filter(Boolean).join(' / ') }
    ]);
    cajaIdentidad(doc, LEFT + 275, y + 13, 258, 68, 'Receptor', [
      { label: 'Nombre', value: receptor.nombre },
      { label: 'Documento', value: [DOC_PERSONA[String(receptor.tipoDocumento)] || receptor.tipoDocumento, receptor.numDocumento].filter(Boolean).join(' · ') },
      { label: 'Teléfono', value: receptor.telefono }, { label: 'Correo', value: receptor.correo },
      { label: 'País destino', value: receptor.codPais }
    ]);
    y += 92;
    for (const item of camposTerceros(evento)) {
      seccion(doc, item.title, LEFT, y, CONTENT);
      doc.rect(LEFT, y + 11, CONTENT, 26).lineWidth(0.45).stroke('#999');
      campo(doc, item.leftLabel, item.leftValue, LEFT + 7, y + 14, CONTENT / 2 - 16, { size: 6.3, labelSize: 5.8, offset: 8, height: 12 });
      campo(doc, item.rightLabel, item.rightValue, LEFT + CONTENT / 2 + 5, y + 14, CONTENT / 2 - 14, { size: 6.3, labelSize: 5.8, offset: 8, height: 12 });
      y += 44;
    }
  }

  const docs = evento.documentosRelacionados || [];
  const relCols = columnasRelacionados();
  anchoTabla(relCols);
  seccion(doc, 'DOCUMENTOS RELACIONADOS', LEFT, y, CONTENT);
  y = cabeceraTabla(doc, relCols, LEFT, y + 12, { height: 23, fontSize: 6 });
  for (const rel of docs) {
    const row = Object.assign({}, rel, { numeroDocumento: rel.numeroDocumento, fechaGeneracion: fecha(rel.fechaGeneracion) });
    const rowH = alturaFila(doc, relCols, row, 5.8);
    if (y + rowH > BOTTOM - 18) {
      texto(doc, 'Página ' + pagina, LEFT + CONTENT - 80, 804, 80, { size: 6, align: 'right', lineBreak: false });
      doc.addPage(); pagina++;
      marco(doc, pagina);
      y = encabezadoRetorno(doc, evento, qr, true);
      seccion(doc, 'DOCUMENTOS RELACIONADOS (CONTINUACIÓN)', LEFT, y, CONTENT);
      y = cabeceraTabla(doc, relCols, LEFT, y + 12, { height: 23, fontSize: 6 });
    }
    y = filaTabla(doc, relCols, row, LEFT, y, { fontSize: 5.8 });
  }

  y += 10;
  const cuerpo = evento.cuerpoDocumento || [];
  const cols = columnasCuerpo();
  anchoTabla(cols);
  const tituloCuerpo = 'CUERPO';
  seccion(doc, tituloCuerpo, LEFT, y, CONTENT);
  y = cabeceraTabla(doc, cols, LEFT, y + 12, { height: 35, fontSize: 5.2 });
  for (let index = 0; index < cuerpo.length; index++) {
    const item = Object.assign({ numItem: index + 1 }, cuerpo[index]);
    const rowH = alturaFila(doc, cols, item, 5.4);
    if (y + rowH > BOTTOM - 150) {
      texto(doc, 'Página ' + pagina, LEFT + CONTENT - 80, 804, 80, { size: 6, align: 'right', lineBreak: false });
      doc.addPage(); pagina++;
      marco(doc, pagina);
      y = encabezadoRetorno(doc, evento, qr, true);
      seccion(doc, tituloCuerpo + ' (CONTINUACIÓN)', LEFT, y, CONTENT);
      y = cabeceraTabla(doc, cols, LEFT, y + 12, { height: 35, fontSize: 5.2 });
    }
    y = filaTabla(doc, cols, item, LEFT, y, { fontSize: 5.4 });
  }

  const resumen = evento.resumen || {};
  const filas = resumenRetorno(resumen);
  const alturaResumen = 18 + filas.length * 13 + 27;
  if (y + alturaResumen > BOTTOM - 10) {
    texto(doc, 'Página ' + pagina, LEFT + CONTENT - 80, 804, 80, { size: 6, align: 'right', lineBreak: false });
    doc.addPage(); pagina++;
    marco(doc, pagina);
    y = encabezadoRetorno(doc, evento, qr, true) + 4;
  }
  seccion(doc, 'RESUMEN', LEFT, y, CONTENT);
  y += 12;
  const labelW = 207, valueW = 94;
  const x0 = LEFT + CONTENT - labelW - valueW;
  filas.forEach((row, i) => {
    const yy = y + i * 13;
    doc.rect(x0, yy, labelW, 13).lineWidth(0.35).stroke('#999');
    doc.rect(x0 + labelW, yy, valueW, 13).lineWidth(0.35).stroke('#999');
    texto(doc, row[0], x0 + 4, yy + 3, labelW - 8, { size: 5.8, align: 'right', lineBreak: false });
    texto(doc, row[1], x0 + labelW + 4, yy + 3, valueW - 8, { size: 5.8, align: 'right', lineBreak: false });
  });
  y += filas.length * 13 + 6;
  doc.rect(LEFT, y, CONTENT, 18).lineWidth(0.4).stroke('#999');
  texto(doc, 'Valor en letras: ' + val(resumen.totalLetras || numeroALetras(Number(resumen.totalPagar || 0))), LEFT + 5, y + 5, CONTENT - 10, { size: 6.1, lineBreak: false, ellipsis: true });
  texto(doc, 'Página ' + pagina, LEFT + CONTENT - 80, 804, 80, { size: 6, align: 'right', lineBreak: false });
  return doc;
}

function generarEventoInvalidacionPDF(evento, sello) {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  let y = encabezadoInvalidacion(doc, evento, sello, 1);
  const emisor = evento.emisor || {};
  const d = evento.documento || {};
  const motivo = evento.motivo || {};
  cajaIdentidad(doc, LEFT, y + 8, 260, 72, 'Identificación del Emisor', [
    { label: 'Nombre', value: emisor.nombre }, { label: 'NIT', value: emisor.nit },
    { label: 'Teléfono', value: emisor.telefono }, { label: 'Correo electrónico', value: emisor.correo }
  ]);
  cajaIdentidad(doc, LEFT + 275, y + 8, 258, 72, 'Identificación del Receptor', [
    { label: 'Nombre', value: d.nombre },
    { label: 'Tipo / N° de identificación', value: [DOC_PERSONA[String(d.tipoDocumento)] || d.tipoDocumento, d.numDocumento].filter(Boolean).join(' · ') },
    { label: 'Correo electrónico', value: d.correo }, { label: 'Teléfono', value: d.telefono }
  ]);
  y += 98;

  seccion(doc, 'Información relativa al Motivo de Invalidación', LEFT, y, CONTENT);
  doc.roundedRect(LEFT, y + 12, CONTENT, 84, 6).lineWidth(0.45).stroke('#999');
  campo(doc, 'Tipo de Invalidación', TIPOS_INVALIDACION[motivo.tipoAnulacion] || motivo.tipoAnulacion, LEFT + 7, y + 18, 250, { size: 6.7, labelSize: 5.8 });
  campo(doc, 'Motivo', motivo.motivoAnulacion, LEFT + 7, y + 37, 250, { size: 6.7, labelSize: 5.8 });
  campo(doc, 'Nombre de quien realiza el evento', motivo.nombreResponsable, LEFT + 7, y + 56, 250, { size: 6.5, labelSize: 5.8 });
  campo(doc, 'Tipo / N° de identificación', [DOC_PERSONA[String(motivo.tipDocResponsable)] || motivo.tipDocResponsable, motivo.numDocResponsable].filter(Boolean).join(' · '), LEFT + 7, y + 73, 250, { size: 6.2, labelSize: 5.5, offset: 8, height: 10 });
  campo(doc, 'Nombre de quien solicita el evento', motivo.nombreSolicita, LEFT + 280, y + 18, 245, { size: 6.5, labelSize: 5.8 });
  campo(doc, 'Tipo / N° de identificación', [DOC_PERSONA[String(motivo.tipDocSolicita)] || motivo.tipDocSolicita, motivo.numDocSolicita].filter(Boolean).join(' · '), LEFT + 280, y + 37, 245, { size: 6.2, labelSize: 5.5 });
  y += 110;

  const relacion = [{
    tipo: tipoDte(d.tipoDte), codigo: d.codigoGeneracion, sello: d.selloRecibido,
    control: d.numeroControl, fecha: fecha(d.fecEmi)
  }];
  const cols = [
    { key: 'tipo', label: 'Tipo DTE/Evento', width: 105 },
    { key: 'codigo', label: 'Código de Generación aplicado', width: 178 },
    { key: 'sello', label: 'Sello de Recepción', width: 95 },
    { key: 'control', label: 'Número de Control', width: 75 },
    { key: 'fecha', label: 'Fecha de Generación', width: 80 }
  ];
  anchoTabla(cols);
  seccion(doc, 'Identificación del Documento/Evento a Invalidar', LEFT, y, CONTENT);
  y = cabeceraTabla(doc, cols, LEFT, y + 12, { height: 30, fontSize: 5.4 });
  relacion.forEach((r) => { y = filaTabla(doc, cols, r, LEFT, y, { fontSize: 5.5 }); });
  y += 14;
  campo(doc, 'Código de Generación que reemplaza al invalidado', d.codigoGeneracionR, LEFT + 5, y, CONTENT - 10, { size: 7.1, labelSize: 6.2, height: 28 });
  return doc;
}

module.exports = { generarEventoRetornoPDF, generarEventoInvalidacionPDF };
