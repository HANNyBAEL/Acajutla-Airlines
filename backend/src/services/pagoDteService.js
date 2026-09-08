const pool = require('../config/db');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dteService = require('./dteService');
const rgPdfService = require('./rgPdfService');

const BREVO_KEY = process.env.BREVO_API_KEY || '';
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const SENDER = {
  email: process.env.BREVO_SENDER_EMAIL || 'facturacion@acajutlaairlines.com',
  name: process.env.BREVO_SENDER_NAME || 'Acajutla Airlines - SkyManager'
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

async function emitirYEnviar(reservationId, tipoDte, receptorOverride) {
  const resultado = await dteService.emitirDTE({ reservation_id: reservationId, tipo_dte: tipoDte, receptor: receptorOverride || undefined }, null);
  const uuid = resultado.uuid || resultado.uuid_generation || (resultado.dte && resultado.dte.identificacion ? resultado.dte.identificacion.codigoGeneracion : null);
  if (!uuid) throw new Error('No se obtuvo el código de generación del DTE');
  const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuid]);
  if (!h.length) throw new Error('DTE no encontrado después de la emisión');
  const header = h[0];

  const doc = await rgPdfService.generarPDF(header);
  const pdfBuffer = await pdfBufferFromDoc(doc);
  const jsonStr = typeof header.full_json === 'string' ? header.full_json : JSON.stringify(header.full_json, null, 2);
  const to = await obtenerCorreo(header);
  const nombreBase = 'DTE_' + header.control_number;
  const adjuntos = [
    { name: nombreBase + '.pdf', content: pdfBuffer.toString('base64'), type: 'application/pdf' },
    { name: nombreBase + '.json', content: Buffer.from(jsonStr).toString('base64'), type: 'application/json' }
  ];

  let envio = { enviado: false };
  if (!to) {
    envio = { enviado: false, motivo: 'El receptor no tiene correo registrado' };
  } else if (BREVO_KEY) {
    try {
      const r = await axios.post(BREVO_URL, {
        sender: SENDER,
        to: [{ email: to }],
        subject: nombreBase + ' - Documento Tributario Electrónico',
        htmlContent: '<p>Estimado cliente: adjuntamos su Documento Tributario Electrónico.</p>' +
          '<p><strong>N° de Control:</strong> ' + header.control_number + '<br>' +
          '<strong>Código de Generación:</strong> ' + header.uuid_generation + '<br>' +
          '<strong>Sello de Recepción:</strong> ' + (header.reception_seal || 'Pendiente') + '</p>' +
          '<p>Adjuntos: representación gráfica (PDF) y archivo JSON transmitido al Ministerio de Hacienda.</p>',
        attachment: adjuntos
      }, { headers: { 'api-key': BREVO_KEY, 'Content-Type': 'application/json' }, timeout: 20000 });
      envio = { enviado: true, messageId: r.data && r.data.messageId };
    } catch (e) {
      envio = { enviado: false, motivo: e.message };
    }
  } else {
    try {
      if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE, { recursive: true });
      fs.writeFileSync(path.join(STORAGE, nombreBase + '.pdf'), pdfBuffer);
      fs.writeFileSync(path.join(STORAGE, nombreBase + '.json'), jsonStr);
      envio = { enviado: true, simulado: true, ruta: STORAGE };
    } catch (e) {
      envio = { enviado: false, motivo: e.message };
    }
  }

  await pool.query(
    "INSERT INTO email_outbox (template, to_email, subject, html, ref_type, ref_id, status, brevo_message_id, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())",
    ['dte_entrega_adjuntos', to, nombreBase, 'Envío automático post-pago con PDF y JSON adjuntos', 'dte', header.uuid_generation, envio.envidado ? (envio.simulado ? 'simulado' : 'sent') : 'failed', envio.messageId || null]
  );
  return { uuid: uuid, numeroControl: header.control_number, sello: header.reception_seal, envio: envio };
}

module.exports = { emitirYEnviar: emitirYEnviar };