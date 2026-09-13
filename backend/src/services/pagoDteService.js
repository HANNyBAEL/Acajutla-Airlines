const pool = require('../config/db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dteService = require('./dteService');
const rgPdfService = require('./rgPdfService');

const BREVO_KEY = process.env.BREVO_API_KEY || '';
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER = {
  email: process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL || 'facturacion@acajutlaairlines.com',
  name: process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'Acajutla Airlines - SkyManager'
};
const STORAGE = path.join(__dirname, '..', '..', 'storage', 'correos');

function pdfBufferFromDoc(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// Brevo no admite la extensión .json, aunque el contenido sea JSON válido.
// El JSON fiscal se conserva sin alteraciones dentro de un ZIP, formato que
// Brevo sí permite como adjunto.
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

async function obtenerCorreo(header) {
  try {
    const json = typeof header.full_json === 'string' ? JSON.parse(header.full_json) : (header.full_json || {});
    if (json.receptor && json.receptor.correo) return json.receptor.correo;
  } catch (e) { /* sin correo en json */ }
  if (header.reservation_id) {
    const [r] = await pool.query('SELECT c.email FROM reservations r LEFT JOIN customers c ON c.id = r.customer_id WHERE r.id = ?', [header.reservation_id]);
    if (r.length && r[0].email) return r[0].email;
  }
  return null;
}

async function enviarAdjuntos(header) {
  const doc = await rgPdfService.generarPDF(header);
  const pdfBuffer = await pdfBufferFromDoc(doc);
  const jsonStr = typeof header.full_json === 'string' ? header.full_json : JSON.stringify(header.full_json, null, 2);
  const to = await obtenerCorreo(header);
  const nombreBase = 'DTE_' + header.control_number;
  const jsonZip = zipArchivo(nombreBase + '.json', Buffer.from(jsonStr, 'utf8'));
  const adjuntos = [
    { name: nombreBase + '.pdf', content: pdfBuffer.toString('base64') },
    { name: nombreBase + '_JSON.zip', content: jsonZip.toString('base64') }
  ];
  if (!to) return { enviado: false, motivo: 'El receptor no tiene correo registrado' };
  if (BREVO_KEY) {
    try {
      const r = await axios.post(BREVO_URL, {
        sender: SENDER,
        to: [{ email: to }],
        subject: nombreBase + ' - Documento Tributario Electrónico',
        htmlContent: '<p>Estimado cliente: adjuntamos su Documento Tributario Electrónico.</p>' +
          '<p><strong>N° de Control:</strong> ' + header.control_number + '<br>' +
          '<strong>Código de Generación:</strong> ' + header.uuid_generation + '<br>' +
          '<strong>Sello de Recepción:</strong> ' + (header.reception_seal || 'Pendiente') + '</p>' +
          '<p>' + (header.transmission_status === 'contingency'
            ? 'El DTE fue emitido en contingencia y se transmitirá al Ministerio de Hacienda al restablecerse el servicio. El PDF no lleva sello aún.'
            : 'Adjuntos: representación gráfica (PDF) y archivo ZIP que contiene el JSON transmitido al Ministerio de Hacienda.') + '</p>',
        attachment: adjuntos
      }, { headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' }, timeout: 20000 });
      return { enviado: true, messageId: r.data && r.data.messageId };
    } catch (e) {
      const detalle = e.response && e.response.data && (e.response.data.message || e.response.data.code || JSON.stringify(e.response.data));
      return {
        enviado: false,
        motivo: e.response && e.response.status === 401
          ? 'Brevo rechazó la API key: ' + (detalle || 'clave no habilitada') + '. Habilite o regenere la clave en Brevo.'
          : (detalle || e.message)
      };
    }
  }
  try {
    if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE, { recursive: true });
    fs.writeFileSync(path.join(STORAGE, nombreBase + '.pdf'), pdfBuffer);
    fs.writeFileSync(path.join(STORAGE, nombreBase + '.json'), jsonStr);
    return { enviado: true, simulado: true, ruta: STORAGE };
  } catch (e) {
    return { enviado: false, motivo: e.message };
  }
}

async function reenviarAdjuntos(uuid) {
  const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuid]);
  if (!h.length) return { enviado: false, motivo: 'DTE no encontrado' };
  return enviarAdjuntos(h[0]);
}

async function emitirYEnviar(reservationId, tipoDte, receptorOverride) {
  const resultado = await dteService.emitirDTE({ reservation_id: reservationId, tipo_dte: tipoDte, receptor: receptorOverride || undefined }, null);
  const uuid = resultado.uuid || resultado.uuid_generation || (resultado.dte && resultado.dte.identificacion ? resultado.dte.identificacion.codigoGeneracion : null);
  if (!uuid) throw new Error('No se obtuvo el código de generación del DTE');
  const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuid]);
  if (!h.length) throw new Error('DTE no encontrado después de la emisión');
  const header = h[0];

  const nombreBase = 'DTE_' + header.control_number;
  const envio = await enviarAdjuntos(header);
  const to = await obtenerCorreo(header);

  await pool.query(
    "INSERT INTO email_outbox (template, to_email, subject, html, ref_type, ref_id, status, brevo_message_id, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())",
    ['dte_entrega_adjuntos', to, nombreBase, 'DTE enviado con PDF y ZIP que contiene el JSON', 'dte', header.uuid_generation, envio.enviado ? (envio.simulado ? 'simulado' : 'sent') : 'failed', envio.messageId || null]
  );
  return { uuid: uuid, numeroControl: header.control_number, sello: header.reception_seal, envio: envio };
}

module.exports = { emitirYEnviar: emitirYEnviar, reenviarAdjuntos: reenviarAdjuntos };
