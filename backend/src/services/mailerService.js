const pool = require('../config/db');
const axios = require('axios');
const pagoDteService = require('./pagoDteService');
const eventoEntregaService = require('./eventoEntregaService');

const CONFIG = {
  apiKey: process.env.BREVO_API_KEY || '',
  // Acepta ambas convenciones usadas por los módulos de correo del proyecto.
  senderEmail: process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL || 'facturacion@acajutlaairlines.com',
  senderName: process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'Acajutla Airlines'
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
  '<div class="head"><h1>ACAJUTLA AIRLINES</h1><p>Sistema Integral de Gestión</p></div>' +
  '<div class="body"><h2 style="margin:0 0 12px;font-size:16px;color:#1d4ed8">' + titulo + '</h2>' + cuerpo + '</div>' +
  '<div class="foot">Correo transaccional automático de Acajutla Airlines.</div></div></body></html>';

const escaparHtml = (valor) => String(valor == null ? '' : valor)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\"/g, '&quot;').replace(/'/g, '&#39;');

const fechaPagoElSalvador = (valor) => {
  if (!valor) return '-';
  // payments.payment_date se guarda como DATETIME UTC. mysql2 devuelve
  // strings por dateStrings:true, así que se marca el valor como UTC antes
  // de convertirlo a la hora local de El Salvador.
  const fechaDb = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(valor)
    ? valor.replace(' ', 'T') + 'Z'
    : valor;
  const fecha = new Date(fechaDb);
  return Number.isNaN(fecha.getTime())
    ? '-'
    : fecha.toLocaleString('es-SV', { timeZone: 'America/El_Salvador' });
};

async function dispatch(outboxId) {
  const [rows] = await pool.query('SELECT * FROM email_outbox WHERE id = ?', [outboxId]);
  if (!rows.length) return { enviado: false, motivo: 'Registro no encontrado' };
  const m = rows[0];
  if (['evento_retorno_adjuntos', 'evento_invalidacion_adjuntos', 'evento_retorno'].includes(m.template)) {
    let r;
    try {
      r = await eventoEntregaService.reenviarAdjuntos(m.template, m.ref_id, m.to_email, m.subject, m.html);
    } catch (e) {
      r = { enviado: false, motivo: e.message };
    }
    const status = r.enviado ? (r.simulado ? 'simulado' : 'sent') : 'failed';
    await pool.query(
      'UPDATE email_outbox SET status = ?, brevo_message_id = ?, error_msg = ?, sent_at = IF(? IN (\'sent\', \'simulado\'), NOW(), sent_at) WHERE id = ?',
      [status, r.messageId || null, r.enviado ? null : r.motivo, status, outboxId]
    );
    return Object.assign({}, r, { outbox_id: outboxId });
  }
  // El registro de auditoría del DTE no almacena binarios. Por eso, al
  // reenviarlo se regeneran el PDF y el ZIP con el JSON antes de enviarlo.
  if (m.template === 'dte_entrega_adjuntos' && m.ref_type === 'dte' && m.ref_id) {
    const r = await pagoDteService.reenviarAdjuntos(m.ref_id);
    await pool.query(
      "UPDATE email_outbox SET status = ?, brevo_message_id = ?, error_msg = ?, sent_at = NOW() WHERE id = ?",
      [r.enviado ? (r.simulado ? 'simulado' : 'sent') : 'failed', r.messageId || null, r.enviado ? null : r.motivo, outboxId]
    );
    return Object.assign({}, r, { outbox_id: outboxId });
  }
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
    `SELECT f.flight_number, f.departure_datetime, ao.iata_code AS origen, ad.iata_code AS destino,
            p.first_names, p.last_names, fs.seat
     FROM flight_segments fs JOIN passengers p ON p.id = fs.passenger_id
     JOIN flights f ON f.id = fs.flight_id
     JOIN routes rt ON rt.id = f.route_id JOIN airports ao ON ao.id = rt.origin_id JOIN airports ad ON ad.id = rt.destination_id
     WHERE fs.reservation_id = ? ORDER BY f.departure_datetime, p.id`, [reservationId]);
  const filasPax = pax.map((p) => '<tr><td>' + escaparHtml(p.first_names) + ' ' + escaparHtml(p.last_names) + ' (' + escaparHtml(p.passenger_type) + ')</td></tr>').join('');
  const filasVuelos = vuelos.map((v) => '<tr><td>' + escaparHtml(v.first_names) + ' ' + escaparHtml(v.last_names) + '</td><td>' + escaparHtml(v.flight_number) + '</td><td>' + escaparHtml(v.origen) + ' → ' + escaparHtml(v.destino) + '</td><td>' + escaparHtml(new Date(v.departure_datetime).toLocaleString('es-SV')) + '</td><td>' + escaparHtml(v.seat || 'Por asignar') + '</td></tr>').join('');
  const cuerpo =
    '<p>Estimado/a ' + escaparHtml(res.first_names) + ' ' + escaparHtml(res.last_names) + ', su reserva fue creada exitosamente.</p>' +
    '<table class="kv"><tr><td><strong>Código PNR</strong></td><td class="total">' + escaparHtml(res.pnr) + '</td></tr>' +
    '<tr><td>Estado</td><td>' + escaparHtml(res.status) + '</td></tr>' +
    '<tr><td>Total estimado</td><td>$' + Number(res.estimated_total).toFixed(2) + '</td></tr>' +
    '<tr><td>Tiempo límite de pago</td><td>' + (res.time_limit ? new Date(res.time_limit).toLocaleString('es-SV') : '-') + '</td></tr></table>' +
    '<h3 style="font-size:13px;margin:12px 0 4px">Pasajeros</h3><table class="kv">' + filasPax + '</table>' +
    '<h3 style="font-size:13px;margin:12px 0 4px">Vuelos y asientos</h3><table class="kv"><tr><td>Pasajero</td><td>Vuelo</td><td>Ruta</td><td>Salida</td><td>Asiento</td></tr>' + filasVuelos + '</table>' +
    '<p class="note">Complete el pago antes del tiempo límite para confirmar su reserva (RN-COM-01). Presente su PNR para check-in y facturación.</p>';
  return queue('confirmacion_reserva', res.email, 'Confirmación de reserva ' + res.pnr + ' - Acajutla Airlines', wrap('Confirmación de Reserva', cuerpo), 'reserva', reservationId);
}

async function enviarComprobantePago(pago) {
  const pagoId = typeof pago === 'object' && pago !== null ? (pago.id || pago.payment_id) : pago;
  const [p] = await pool.query(
    `SELECT p.*, r.pnr, r.estimated_total, r.paid_total, c.first_names, c.last_names, c.email
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
    '<tr><td>Fecha</td><td>' + fechaPagoElSalvador(row.payment_date) + '</td></tr></table>' +
    '<p class="note">Conserve este comprobante. Su factura electrónica (FE) o comprobante de crédito fiscal (CCFE) será emitido y enviado según normativa DTE.</p>';
  return queue('comprobante_pago', row.email, 'Comprobante de pago - Reserva ' + row.pnr, wrap('Comprobante de Pago', cuerpo), 'pago', pagoId);
}

async function enviarReembolso(reembolso) {
  const reembolsoId = typeof reembolso === 'object' && reembolso !== null
    ? (reembolso.id || reembolso.refund_payment_id)
    : reembolso;
  const [p] = await pool.query(
    `SELECT rf.*, original.id AS original_payment_id, original.method AS original_method,
            original.external_reference AS original_reference,
            r.pnr, r.paid_total, r.status AS reservation_status,
            c.first_names, c.last_names,
            COALESCE(c.email, (
              SELECT JSON_UNQUOTE(JSON_EXTRACT(h.full_json, '$.receptor.correo'))
              FROM dte_headers h WHERE h.reservation_id = r.id
              ORDER BY h.created_at DESC LIMIT 1
            )) AS email
     FROM payments rf
     JOIN payments original ON original.id = rf.original_payment_id
     JOIN reservations r ON r.id = rf.reservation_id
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE rf.id = ? AND rf.type = 'refund' AND rf.status = 'refunded'`, [reembolsoId]);
  if (!p.length) return { enviado: false, motivo: 'Reembolso no encontrado' };
  const row = p[0];
  const cuerpo =
    '<p>Estimado/a ' + escaparHtml((row.first_names || '') + ' ' + (row.last_names || '')) +
    ', confirmamos que se procesó la devolución de su pago.</p>' +
    '<table class="kv"><tr><td>Reserva (PNR)</td><td class="total">' + escaparHtml(row.pnr) + '</td></tr>' +
    '<tr><td>Monto reembolsado</td><td class="total">$' + Number(row.amount).toFixed(2) + ' ' + escaparHtml(row.currency) + '</td></tr>' +
    '<tr><td>Método de devolución</td><td>' + escaparHtml(({ card: 'Tarjeta', transfer: 'Transferencia bancaria', cash: 'Efectivo', paypal: 'PayPal' })[row.method] || row.method) + '</td></tr>' +
    '<tr><td>Método del pago original</td><td>' + escaparHtml(({ card: 'Tarjeta', transfer: 'Transferencia bancaria', cash: 'Efectivo', paypal: 'PayPal' })[row.original_method] || row.original_method) + '</td></tr>' +
    '<tr><td>Referencia de reembolso</td><td>' + escaparHtml(row.external_reference || '-') + '</td></tr>' +
    '<tr><td>Pago original</td><td>#' + escaparHtml(row.original_payment_id) + ' · ' + escaparHtml(row.original_reference || '-') + '</td></tr>' +
    '<tr><td>Motivo</td><td>' + escaparHtml(row.reason || '-') + '</td></tr>' +
    '<tr><td>Fecha</td><td>' + escaparHtml(fechaPagoElSalvador(row.payment_date)) + '</td></tr></table>' +
    '<p>El tiempo para que el monto se refleje depende del medio de pago y de la entidad que lo procesa.</p>';
  return queue('reembolso', row.email, 'Confirmación de reembolso - Reserva ' + row.pnr, wrap('Confirmación de Reembolso', cuerpo), 'pago', reembolsoId);
}

async function enviarEventoRetorno(uuid) {
  const [rows] = await pool.query(
    `SELECT e.uuid, e.sello, e.motivo, e.returned_amount, e.full_json,
            h.uuid_generation, h.control_number, h.dte_type, h.reservation_id,
            r.pnr, c.first_names, c.last_names, c.email
     FROM dte_return_events e
     JOIN dte_headers h ON h.id = e.dte_id
     LEFT JOIN reservations r ON r.id = h.reservation_id
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE e.uuid = ? ORDER BY e.id`, [uuid]);
  if (!rows.length) return { enviado: false, motivo: 'Evento de retorno no encontrado' };
  const evento = typeof rows[0].full_json === 'string' ? JSON.parse(rows[0].full_json) : rows[0].full_json;
  let dteOriginal = {};
  if (rows[0].uuid_generation) {
    const [dteRows] = await pool.query('SELECT full_json FROM dte_headers WHERE uuid_generation = ?', [rows[0].uuid_generation]);
    if (dteRows.length) dteOriginal = typeof dteRows[0].full_json === 'string' ? JSON.parse(dteRows[0].full_json) : (dteRows[0].full_json || {});
  }
  const receptor = evento?.receptor || dteOriginal.receptor || {};
  const destinatario = receptor.correo || rows[0].email;
  const nombre = receptor.nombre || [rows[0].first_names, rows[0].last_names].filter(Boolean).join(' ') || 'cliente';
  const filas = rows.map((row) => '<tr><td>' + escaparHtml(row.control_number || row.uuid_generation) + '</td><td>' +
    escaparHtml(String(row.dte_type) === '01' ? 'FE' : row.dte_type) + '</td><td>$' +
    Number(row.returned_amount).toFixed(2) + '</td></tr>').join('');
  const resumen = evento?.resumen || {};
  const total = Number(resumen.totalPagar ?? resumen.montoTotalOperacion ?? rows.reduce((sum, row) => sum + Number(row.returned_amount || 0), 0));
  const cuerpo =
    '<p>Estimado/a ' + escaparHtml(nombre) + ', se registró un Evento de Retorno relacionado con su documento tributario.</p>' +
    '<table class="kv"><tr><td>Reserva (PNR)</td><td>' + escaparHtml(rows[0].pnr || '-') + '</td></tr>' +
    '<tr><td>Evento</td><td>' + escaparHtml(rows[0].uuid) + '</td></tr>' +
    '<tr><td>Sello</td><td>' + escaparHtml(rows[0].sello || '-') + '</td></tr>' +
    '<tr><td>Descripción</td><td>' + escaparHtml(rows[0].motivo || '-') + '</td></tr>' +
    '<tr><td>Total consignado en el evento</td><td class="total">$' + total.toFixed(2) + ' USD</td></tr></table>' +
    '<h3 style="font-size:13px;margin:12px 0 4px">Documentos relacionados</h3>' +
    '<table class="kv"><tr><td>N° de control</td><td>Tipo</td><td>Monto aplicado</td></tr>' + filas + '</table>' +
    '<p>Adjuntamos el archivo JSON del evento y su representación gráfica en PDF.</p>' +
    '<p class="note">Este correo confirma el registro del evento fiscal. La devolución efectiva del pago se procesa por separado y se confirma en otro correo.</p>';
  return queue('evento_retorno_adjuntos', destinatario, 'Evento de Retorno - ' + (rows[0].pnr || rows[0].uuid), wrap('Notificación de Evento de Retorno', cuerpo), 'dte_evento', uuid);
}

async function enviarEventoInvalidacion(uuid) {
  const [rows] = await pool.query(
    `SELECT i.uuid, i.sello, i.tipo_invalidacion, i.motivo, i.full_json,
            h.uuid_generation, h.control_number, h.dte_type, h.full_json AS dte_json,
            r.pnr, c.first_names, c.last_names, c.email
     FROM dte_invalidation_events i
     JOIN dte_headers h ON h.id = i.dte_id
     LEFT JOIN reservations r ON r.id = h.reservation_id
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE i.uuid = ? LIMIT 1`, [uuid]);
  if (!rows.length) return { enviado: false, motivo: 'Evento de invalidación no encontrado' };
  const row = rows[0];
  const evento = typeof row.full_json === 'string' ? JSON.parse(row.full_json) : (row.full_json || {});
  const dte = typeof row.dte_json === 'string' ? JSON.parse(row.dte_json) : (row.dte_json || {});
  const destinatario = evento.documento?.correo || dte.receptor?.correo || row.email;
  const responsable = evento.motivo || {};
  const documento = evento.documento || {};
  const tipoMotivo = ({
    1: 'Error en la información del DTE',
    2: 'Rescindir de la operación realizada',
    3: 'Otro'
  })[String(row.tipo_invalidacion)] || String(row.tipo_invalidacion);
  const cuerpo =
    '<p>Se registró un Evento de Invalidación relacionado con el documento que recibió.</p>' +
    '<table class="kv"><tr><td>Reserva (PNR)</td><td>' + escaparHtml(row.pnr || '-') + '</td></tr>' +
    '<tr><td>Documento invalidado</td><td>' + escaparHtml(row.control_number || row.uuid_generation) + ' · ' + escaparHtml(row.dte_type) + '</td></tr>' +
    '<tr><td>Código del evento</td><td>' + escaparHtml(row.uuid) + '</td></tr>' +
    '<tr><td>Sello de recepción</td><td>' + escaparHtml(row.sello || '-') + '</td></tr>' +
    '<tr><td>Tipo de invalidación</td><td>' + escaparHtml(tipoMotivo) + '</td></tr>' +
    '<tr><td>Motivo</td><td>' + escaparHtml(responsable.motivoAnulacion || row.motivo || '-') + '</td></tr>' +
    '<tr><td>DTE de reemplazo</td><td>' + escaparHtml(documento.codigoGeneracionR || 'No aplica') + '</td></tr></table>' +
    '<p>Adjuntamos el archivo JSON del evento y su representación gráfica en PDF.</p>' +
    '<p class="note">Documento de práctica generado en el entorno simulado; no fue transmitido al Ministerio de Hacienda.</p>';
  return queue('evento_invalidacion_adjuntos', destinatario, 'Evento de Invalidación - ' + (row.pnr || row.uuid), wrap('Notificación de Evento de Invalidación', cuerpo), 'dte_invalidacion', uuid);
}

async function enviarReciboVenta(pago) {
  const pagoId = typeof pago === 'object' && pago !== null ? (pago.id || pago.payment_id) : pago;
  const [p] = await pool.query(
    `SELECT p.*, r.pnr, r.estimated_total, r.paid_total, c.first_names, c.last_names, c.email
     FROM payments p JOIN reservations r ON r.id = p.reservation_id LEFT JOIN customers c ON c.id = r.customer_id
     WHERE p.id = ? AND p.status = 'approved' AND p.type = 'payment'`, [pagoId]);
  if (!p.length) return { enviado: false, motivo: 'Pago aprobado no encontrado' };
  const row = p[0];
  const [vuelos] = await pool.query(
    `SELECT f.flight_number, f.departure_datetime, ao.iata_code AS origen, ad.iata_code AS destino
     FROM flight_segments fs JOIN flights f ON f.id = fs.flight_id
     JOIN routes rt ON rt.id = f.route_id JOIN airports ao ON ao.id = rt.origin_id JOIN airports ad ON ad.id = rt.destination_id
     WHERE fs.reservation_id = ? ORDER BY f.departure_datetime, fs.id`, [row.reservation_id]);
  const rutas = vuelos.map(v => '<tr><td>' + escaparHtml(v.flight_number) + '</td><td>' + escaparHtml(v.origen) + ' → ' + escaparHtml(v.destino) + '</td><td>' + escaparHtml(new Date(v.departure_datetime).toLocaleString('es-SV')) + '</td></tr>').join('');
  const cuerpo =
    '<p>Estimado/a ' + escaparHtml(row.first_names || '') + ' ' + escaparHtml(row.last_names || '') + ', hemos recibido el pago de su boleto.</p>' +
    '<table class="kv"><tr><td>Reserva (PNR)</td><td class="total">' + escaparHtml(row.pnr) + '</td></tr>' +
    '<tr><td>Total del boleto</td><td>$' + Number(row.estimated_total).toFixed(2) + ' ' + escaparHtml(row.currency) + '</td></tr>' +
    '<tr><td>Total recibido</td><td>$' + Number(row.paid_total || 0).toFixed(2) + ' ' + escaparHtml(row.currency) + '</td></tr>' +
    '<tr><td>Último pago</td><td>$' + Number(row.amount).toFixed(2) + ' ' + escaparHtml(row.currency) + '</td></tr>' +
    '<tr><td>Método</td><td>' + escaparHtml(row.method) + '</td></tr>' +
    '<tr><td>Referencia</td><td>' + escaparHtml(row.external_reference || '-') + '</td></tr>' +
    '<tr><td>Fecha</td><td>' + escaparHtml(fechaPagoElSalvador(row.payment_date)) + '</td></tr></table>' +
    '<h3 style="font-size:13px;margin:12px 0 4px">Itinerario</h3>' +
    '<table class="kv"><tr><td>Vuelo</td><td>Ruta</td><td>Salida</td></tr>' + rutas + '</table>' +
    '<p class="note">Este recibo acredita la venta y el pago. No es un DTE ni sustituye los documentos fiscales que pudieran corresponder en la jurisdicción aplicable.</p>';
  return queue('recibo_venta', row.email, 'Recibo de venta - Reserva ' + row.pnr, wrap('Recibo de Venta', cuerpo), 'pago', pagoId);
}

async function enviarDTE(dte) {
  const uuid = typeof dte === 'object' && dte !== null ? (dte.uuid || dte.uuid_generation) : dte;
  const [h] = await pool.query(
    `SELECT h.*, r.pnr, c.first_names, c.last_names, c.email
     FROM dte_headers h LEFT JOIN reservations r ON r.id = h.reservation_id LEFT JOIN customers c ON c.id = r.customer_id
     WHERE h.uuid_generation = ?`, [uuid]);
  if (!h.length) return { enviado: false, motivo: 'DTE no encontrado' };
  const row = h[0];
  const tipoNombre = ({
    '01': 'Factura Electrónica (FE)',
    '03': 'Comprobante de Crédito Fiscal (CCFE)',
    '05': 'Nota de Crédito Electrónica (NCE)',
    '06': 'Nota de Débito Electrónica (NDE)',
    '11': 'Factura de Exportación Electrónica (FEXE)',
    '14': 'Factura de Sujeto Excluido Electrónica (FSEE)'
  })[String(row.dte_type)] || 'DTE ' + row.dte_type;
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

async function enviarCancelacionVuelo(reservationId, flightData, motivo) {
  const [r] = await pool.query('SELECT r.*, c.first_names, c.last_names, c.email FROM reservations r LEFT JOIN customers c ON c.id = r.customer_id WHERE r.id = ?', [reservationId]);
  if (!r.length) return { enviado: false, motivo: 'Reserva no encontrada' };
  const res = r[0];
  const fechaVuelo = flightData && flightData.departure_datetime ? new Date(flightData.departure_datetime).toLocaleString('es-SV') : 'Fecha no disponible';
  const numVuelo = flightData && flightData.flight_number ? flightData.flight_number : 'Vuelo';
  const cuerpo =
    '<p>Estimado/a ' + (res.first_names || '') + ' ' + (res.last_names || '') + ':</p>' +
    '<p>Le informamos que el vuelo <strong>' + numVuelo + '</strong> programado para el <strong>' + fechaVuelo +
    '</strong> ha sido <strong>CANCELADO</strong> por la aerolínea (' + (motivo || 'Motivos operacionales') + ').</p>' +
    '<table class="kv"><tr><td><strong>Código PNR</strong></td><td class="total">' + res.pnr + '</td></tr>' +
    '<tr><td>Estado de reserva</td><td>Cancelada</td></tr>' +
    '<tr><td>Monto Reembolsado</td><td class="total">$' + Number(res.paid_total || 0).toFixed(2) + ' USD</td></tr></table>' +
    '<p class="note">Si su reserva tenía pagos registrados, el reembolso ha sido procesado de acuerdo con nuestra política de compensación. Si requiere asistencia, por favor contacte a nuestro equipo de atención.</p>';
  return queue('cancelacion_vuelo', res.email, 'Cancelación de vuelo ' + numVuelo + ' - Reserva ' + res.pnr, wrap('Aviso de Cancelación de Vuelo', cuerpo), 'reserva', reservationId);
}

async function listar() {
  const [rows] = await pool.query('SELECT id, template, to_email, subject, ref_type, ref_id, status, error_msg, brevo_message_id, created_at, sent_at FROM email_outbox ORDER BY id DESC LIMIT 200');
  return rows;
}

async function obtener(id) {
  const [rows] = await pool.query('SELECT * FROM email_outbox WHERE id = ?', [id]);
  return rows[0] || null;
}

module.exports = {
  queue: queue,
  dispatch: dispatch,
  enviarConfirmacionReserva: enviarConfirmacionReserva,
  enviarComprobantePago: enviarComprobantePago,
  enviarReembolso: enviarReembolso,
  enviarReciboVenta: enviarReciboVenta,
  enviarDTE: enviarDTE,
  enviarEventoRetorno: enviarEventoRetorno,
  enviarEventoInvalidacion: enviarEventoInvalidacion,
  enviarCancelacionVuelo: enviarCancelacionVuelo,
  listar: listar,
  obtener: obtener
};
