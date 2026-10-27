const pool = require('../config/db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const eventoPdfService = require('./eventoPdfService');

const BREVO_KEY = process.env.BREVO_API_KEY || '';
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER = {
  email: process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL || 'facturacion@acajutlaairlines.com',
  name: process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'Acajutla Airlines'
};
const STORAGE = path.join(__dirname, '..', '..', 'storage', 'correos');

function pdfBufferFromDoc(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipArchivo(nombre, contenido) {
  const nombreBuffer = Buffer.from(nombre, 'utf8');
  const comprimido = zlib.deflateRawSync(contenido);
  const crc = crc32(contenido);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comprimido.length, 18);
  local.writeUInt32LE(contenido.length, 22);
  local.writeUInt16LE(nombreBuffer.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comprimido.length, 20);
  central.writeUInt32LE(contenido.length, 24);
  central.writeUInt16LE(nombreBuffer.length, 28);
  const directorio = Buffer.concat([central, nombreBuffer]);
  const cierre = Buffer.alloc(22);
  cierre.writeUInt32LE(0x06054b50, 0);
  cierre.writeUInt16LE(1, 8);
  cierre.writeUInt16LE(1, 10);
  cierre.writeUInt32LE(directorio.length, 12);
  cierre.writeUInt32LE(local.length + nombreBuffer.length + comprimido.length, 16);
  return Buffer.concat([local, nombreBuffer, comprimido, directorio, cierre]);
}

const parseJson = (json) => (typeof json === 'string' ? JSON.parse(json) : (json || {}));
const nombreBaseEvento = (prefijo, uuid) => (prefijo + '_' + String(uuid)).replace(/[^A-Za-z0-9_-]/g, '_');

async function cargarEventoRetorno(uuid) {
  const [rows] = await pool.query(
    `SELECT e.uuid, e.sello, e.full_json AS event_json,
            h.uuid_generation, h.dte_type, h.full_json AS dte_json, c.email AS customer_email
     FROM dte_return_events e
     JOIN dte_headers h ON h.id = e.dte_id
     LEFT JOIN reservations r ON r.id = h.reservation_id
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE e.uuid = ? ORDER BY e.id`, [uuid]);
  if (!rows.length) return null;
  const evento = parseJson(rows[0].event_json);
  evento.selloRecibido = rows[0].sello || evento.selloRecibido;
  const original = parseJson(rows[0].dte_json);
  const to = evento.receptor?.correo || original.receptor?.correo || rows[0].customer_email;
  return { evento, to, uuid: rows[0].uuid };
}

async function cargarEventoInvalidacion(uuid) {
  const [rows] = await pool.query(
    `SELECT i.uuid, i.sello, i.full_json AS event_json,
            h.uuid_generation, h.full_json AS dte_json, c.email AS customer_email
     FROM dte_invalidation_events i
     JOIN dte_headers h ON h.id = i.dte_id
     LEFT JOIN reservations r ON r.id = h.reservation_id
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE i.uuid = ? LIMIT 1`, [uuid]);
  if (!rows.length) return null;
  const evento = parseJson(rows[0].event_json);
  evento.selloRecibido = rows[0].sello || evento.selloRecibido;
  const original = parseJson(rows[0].dte_json);
  const to = evento.documento?.correo || original.receptor?.correo || rows[0].customer_email;
  return { evento, to, uuid: rows[0].uuid, sello: rows[0].sello };
}

async function reenviarAdjuntos(template, uuid, correoExistente, asuntoExistente, htmlExistente) {
  const invalida = template === 'evento_invalidacion_adjuntos';
  const dato = invalida ? await cargarEventoInvalidacion(uuid) : await cargarEventoRetorno(uuid);
  if (!dato) return { enviado: false, motivo: invalida ? 'Evento de invalidación no encontrado' : 'Evento de retorno no encontrado' };
  const destinatario = correoExistente || dato.to;
  if (!destinatario) return { enviado: false, motivo: 'El receptor no tiene correo registrado' };

  const pdfDoc = invalida
    ? eventoPdfService.generarEventoInvalidacionPDF(dato.evento, dato.sello)
    : await eventoPdfService.generarEventoRetornoPDF(dato.evento);
  const pdfBuffer = await pdfBufferFromDoc(pdfDoc);
  const jsonString = JSON.stringify(dato.evento, null, 2);
  const base = nombreBaseEvento(invalida ? 'EVENTO_INVALIDACION' : 'EVENTO_RETORNO', dato.uuid);
  const jsonZip = zipArchivo(base + '.json', Buffer.from(jsonString, 'utf8'));
  const attachments = [
    { name: base + '.pdf', content: pdfBuffer.toString('base64') },
    { name: base + '_JSON.zip', content: jsonZip.toString('base64') }
  ];
  const html = htmlExistente || '<p>Adjuntamos el archivo JSON y la representación gráfica del evento.</p>';
  const asunto = asuntoExistente || ((invalida ? 'Evento de Invalidación ' : 'Evento de Retorno ') + dato.uuid);

  if (BREVO_KEY) {
    const ambientePrueba = (process.env.DTE_AMBIENTE || '00') === '00';
    const subject = (ambientePrueba ? '[SIMULACIÓN ESCOLAR] ' : '') + asunto;
    const detalle = ambientePrueba
      ? '<p><strong>Documento de práctica sin validez fiscal. No se ha transmitido al Ministerio de Hacienda.</strong></p>'
      : '';
    try {
      const response = await axios.post(BREVO_URL, {
        sender: SENDER,
        to: [{ email: destinatario }],
        subject,
        htmlContent: html + detalle,
        attachment: attachments
      }, { headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' }, timeout: 20000 });
      return { enviado: true, messageId: response.data && response.data.messageId, archivos: attachments.map((a) => a.name) };
    } catch (e) {
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      return { enviado: false, motivo: detail };
    }
  }

  try {
    if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE, { recursive: true });
    fs.writeFileSync(path.join(STORAGE, base + '.pdf'), pdfBuffer);
    fs.writeFileSync(path.join(STORAGE, base + '.json'), jsonString);
    return { enviado: true, simulado: true, ruta: STORAGE, archivos: [base + '.pdf', base + '.json'] };
  } catch (e) {
    return { enviado: false, motivo: e.message };
  }
}

module.exports = { cargarEventoRetorno, cargarEventoInvalidacion, reenviarAdjuntos };
