const pool = require('../config/db');
const axios = require('axios');

const CONFIG = {
  apiKey: process.env.BREVO_API_KEY || '',
  // Acepta ambas convenciones usadas por los módulos de correo del proyecto.
  senderEmail: process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL || 'facturacion@acajutlaairlines.com',
  senderName: process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'Acajutla Airlines - SkyManager'
};

const estilos = 'body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;margin:0;padding:24px}' +
  '.card{max-width:640px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb}' +
  '.head{background:#1d4ed8;color:#fff;padding:20px 24px}.head h1{margin:0;font-size:18px}.head p{margin:4px 0 0;font-size:12px;opacity:.85}' +
  '.body{padding:24px;color:#111827;font-size:14px;line-height:1.5}' +
  '.kv{width:100%;border-collapse:collapse;margin:12px 0}.kv td{padding:6px 8px;border:1px solid #e5e7eb;font-size:13px}' +
  '.total{font-size:16px;font-weight:bold;color:#1d4ed8}' +
  '.note{background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:10px;border-radius:8px;font-size:12px}' +
  '.foot{background:#f9fafb;padding:12px 24px;font-size:11px;color:#6b7280}';

const wrap = (titulo, cuerpo) =>
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + estilos + '</style></head><body><div class="card">' +
  '<div class="head"><h1>ACAJUTLA AIRLINES</h1><p>SkyManager - Sistema Integral de Gestión</p></div>' +
  '<div class="body"><h2 style="margin:0 0 12px;font-size:16px;color:#1d4ed8">' + titulo + '</h2>' + cuerpo + '</div>' +
  '<div class="foot">Correo transaccional automático. Ambiente de pruebas (CAT-001: 00). Representación gráfica disponible en el backoffice.</div></div></body></html>';

async function dispatch(outboxId) {
  const [rows] = await pool.query('SELECT * FROM email_outbox WHERE id = ?', [outboxId]);
  if (!rows.length) return { enviado: false, motivo: 'Registro no encontrado' };
  const m = rows[0];
  if (!CONFIG.apiKey) {
    await pool.query("UPDATE email_outbox SET status = 'simulado', sent_at = NOW() WHERE id = ?", [outboxId]);
    console.log('[CORREO SIMULADO] -> ' + m.to_email + ' | ' + m.subject);
    return { enviado: true, simulado: true, outbox_id: outboxId };
  }
  try {
    const r = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { email: CONFIG.senderEmail, name: CONFIG.senderName },
      to: [{ email: m.to_email }],
      subject: m.subject,
      htmlContent: m.html
    }, { headers: { 'api-key': CONFIG.apiKey, 'Content-Type': 'application/json' }, timeout: 15000 });
    await pool.query("UPDATE email_outbox SET status = 'sent', brevo_message_id = ?, sent_at = NOW() WHERE id = ?", [String((r.data && r.data.messageId) || ''), outboxId]);
    return { enviado: true, outbox_id: outboxId };
  } catch (e) {
    const msg = e.response && e.response.data ? JSON.stringify(e.response.data) : e.message;
    await pool.query("UPDATE email_outbox SET status = 'failed', error_msg = ? WHERE id = ?", [msg, outboxId]);
    return { enviado: false, motivo: msg, outbox_id: outboxId };
  }
}

async function queue(template, toEmail, subject, html, refType, refId) {
  if (!toEmail) return { enviado: false, motivo: 'El registro no tiene correo destinatario' };
  const [ins] = await pool.query(
    "INSERT INTO email_outbox (template, to_email, subject, html, ref_type, ref_id, status, created_at) VALUES (?,?,?,?,?,?, 'pending', NOW())",
    [template, toEmail, subject, html, refType || null, refId != null ? String(refId) : null]
  );
  return dispatch(ins.insertId);
}

async function enviarConfirmacionReserva(reservationId) {
  const [r] = await pool.query('SELECT r.*, c.first_names, c.last_names, c.email FROM reservations r LEFT JOIN customers c ON c.id = r.customer_id WHERE r.id = ?', [reservationId]);
  if (!r.length) return { enviado: false, motivo: 'Reserva no encontrada' };
  const res = r[0];
  const [pax] = await pool.query('SELECT first_names, last_names, passenger_type FROM passengers WHERE reservation_id = ?', [reservationId]);
  const [vuelos] = await pool.query(
    `SELECT f.flight_number, f.departure_datetime, ao.iata_code AS origen, ad.iata_code AS destino
     FROM flight_segments fs JOIN flights f ON f.id = fs.flight_id
     JOIN routes rt ON rt.id = f.route_id JOIN airports ao ON ao.id = rt.origin_id JOIN airports ad ON ad.id = rt.destination_id
     WHERE fs.reservation_id = ?`, [reservationId]);
  const filasPax = pax.map((p) => '<tr><td>' + p.first_names + ' ' + p.last_names + ' (' + p.passenger_type + ')</td></tr>').join('');
  const filasVuelos = vuelos.map((v) => '<tr><td>' + v.flight_number + '</td><td>' + v.origen + ' → ' + v.destino + '</td><td>' + new Date(v.departure_datetime).toLocaleString('es-SV') + '</td></tr>').join('');
  const cuerpo =
    '<p>Estimado/a ' + (res.first_names || '') + ' ' + (res.last_names || '') + ', su reserva fue creada exitosamente.</p>' +
    '<table class="kv"><tr><td><strong>Código PNR</strong></td><td class="total">' + res.pnr + '</td></tr>' +
    '<tr><td>Estado</td><td>' + res.status + '</td></tr>' +
    '<tr><td>Total estimado</td><td>$' + Number(res.estimated_total).toFixed(2) + '</td></tr>' +
    '<tr><td>Tiempo límite de pago</td><td>' + (res.time_limit ? new Date(res.time_limit).toLocaleString('es-SV') : '-') + '</td></tr></table>' +
    '<h3 style="font-size:13px;margin:12px 0 4px">Pasajeros</h3><table class="kv">' + filasPax + '</table>' +
    '<h3 style="font-size:13px;margin:12px 0 4px">Vuelos</h3><table class="kv"><tr><td>Vuelo</td><td>Ruta</td><td>Salida</td></tr>' + filasVuelos + '</table>' +
    '<p class="note">Complete el pago antes del tiempo límite para confirmar su reserva (RN-COM-01). Presente su PNR para check-in y facturación.</p>';
  return queue('confirmacion_reserva', res.email, 'Confirmación de reserva ' + res.pnr + ' - Acajutla Airlines', wrap('Confirmación de Reserva', cuerpo), 'reserva', reservationId);
}

async function enviarComprobantePago(pago) {
  const pagoId = typeof pago === 'object' && pago !== null ? (pago.id || pago.payment_id) : pago;
  const [p] = await pool.query(
    `SELECT p.*, r.pnr, r.estimated_total, c.first_names, c.last_names, c.email
     FROM payments p JOIN reservations r ON r.id = p.reservation_id LEFT JOIN customers c ON c.id = r.customer_id
     WHERE p.id = ?`, [pagoId]);
  if (!p.length) return { enviado: false, motivo: 'Pago no encontrado' };
  const row = p[0];
  const cuerpo =
    '<p>Estimado/a ' + (row.first_names || '') + ' ' + (row.last_names || '') + ', hemos recibido su pago.</p>' +
    '<table class="kv"><tr><td>Reserva (PNR)</td><td class="total">' + row.pnr + '</td></tr>' +
    '<tr><td>Monto</td><td>$' + Number(row.amount).toFixed(2) + ' ' + row.currency + '</td></tr>' +
    '<tr><td>Método</td><td>' + row.method + '</td></tr>' +
    '<tr><td>Referencia</td><td>' + (row.external_reference || '-') + '</td></tr>' +
    '<tr><td>Estado del pago</td><td>' + row.status + '</td></tr>' +
    '<tr><td>Fecha</td><td>' + new Date(row.payment_date).toLocaleString('es-SV') + '</td></tr></table>' +
    '<p class="note">Conserve este comprobante. Su factura electrónica (FE) o comprobante de crédito fiscal (CCFE) será emitido y enviado según normativa DTE.</p>';
  return queue('comprobante_pago', row.email, 'Comprobante de pago - Reserva ' + row.pnr, wrap('Comprobante de Pago', cuerpo), 'pago', pagoId);
}

async function enviarDTE(dte) {
  const uuid = typeof dte === 'object' && dte !== null ? (dte.uuid || dte.uuid_generation) : dte;
  const [h] = await pool.query(
    `SELECT h.*, r.pnr, c.first_names, c.last_names, c.email
     FROM dte_headers h LEFT JOIN reservations r ON r.id = h.reservation_id LEFT JOIN customers c ON c.id = r.customer_id
     WHERE h.uuid_generation = ?`, [uuid]);
  if (!h.length) return { enviado: false, motivo: 'DTE no encontrado' };
  const row = h[0];
  const tipoNombre = row.dte_type === '01' ? 'Factura Electrónica (FE)' : row.dte_type === '03' ? 'Comprobante de Crédito Fiscal (CCFE)' : 'DTE ' + row.dte_type;
  const cuerpo =
    '<p>Estimado/a ' + (row.first_names || '') + ' ' + (row.last_names || '') + ', adjuntamos los datos de su documento tributario electrónico.</p>' +
    '<table class="kv"><tr><td>Tipo</td><td>' + tipoNombre + '</td></tr>' +
    '<tr><td>N° de Control</td><td style="font-family:monospace">' + row.control_number + '</td></tr>' +
    '<tr><td>Código de Generación</td><td style="font-family:monospace;font-size:11px">' + row.uuid_generation + '</td></tr>' +
    '<tr><td>Sello de Recepción</td><td style="font-family:monospace">' + (row.reception_seal || 'PENDIENTE (CONTINGENCIA)') + '</td></tr>' +
    '<tr><td>Reserva (PNR)</td><td>' + (row.pnr || '-') + '</td></tr>' +
    '<tr><td>Total a pagar</td><td class="total">$' + Number(row.total_to_pay).toFixed(2) + '</td></tr>' +
    '<tr><td>Fecha de emisión</td><td>' + new Date(row.emission_date).toLocaleString('es-SV') + '</td></tr></table>' +
    '<p class="note">La Representación Gráfica en PDF (con QR y Sello de Recepción) puede descargarse desde el backoffice en Facturación DTE → PDF. Este documento cumple la Normativa de Cumplimiento DTE V2.0 (Anexo II).</p>';
  return queue('dte_entrega', row.email, row.control_number + ' - ' + tipoNombre + ' - Acajutla Airlines', wrap('Documento Tributario Electrónico', cuerpo), 'dte', uuid);
}

async function listar() {
  const [rows] = await pool.query('SELECT id, template, to_email, subject, ref_type, ref_id, status, error_msg, brevo_message_id, created_at, sent_at FROM email_outbox ORDER BY id DESC LIMIT 200');
  return rows;
}

module.exports = {
  queue: queue,
  dispatch: dispatch,
  enviarConfirmacionReserva: enviarConfirmacionReserva,
  enviarComprobantePago: enviarComprobantePago,
  enviarDTE: enviarDTE,
  listar: listar
};
