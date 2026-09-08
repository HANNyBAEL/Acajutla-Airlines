const pool = require('../config/db');
let brevo = null;
try { brevo = require('../config/brevo'); } catch (e) { brevo = null; }

const enviar = async (to, subject, html) => {
  if (!to) return { enviado: false, motivo: 'El destinatario no tiene correo registrado' };
  if (brevo && process.env.BREVO_API_KEY) {
    try {
      await brevo.enviarCorreo(to, subject, html);
      return { enviado: true, destinatario: to };
    } catch (e) {
      console.error('[BREVO] Error:', e.message);
      return { enviado: false, motivo: e.message };
    }
  }
  console.log('==================================================');
  console.log('[EMAIL SIMULADO] Para: ' + to);
  console.log('[EMAIL SIMULADO] Asunto: ' + subject);
  console.log('[EMAIL SIMULADO] Configura BREVO_API_KEY en .env para envíos reales');
  console.log('==================================================');
  return { enviado: true, simulado: true, destinatario: to };
};

const datosReserva = async (reservationId) => {
  const [r] = await pool.query(
    `SELECT r.*, c.first_names AS c_first, c.last_names AS c_last, c.email AS c_email
     FROM reservations r LEFT JOIN customers c ON c.id = r.customer_id WHERE r.id = ?`,
    [reservationId]
  );
  if (!r.length) throw new Error('Reserva no encontrada');
  const [pax] = await pool.query(
    `SELECT p.first_names, p.last_names, p.passenger_type, fs.seat, fs.checkin_status,
            f.flight_number, f.departure_datetime, ao.iata_code AS origen, ad.iata_code AS destino
     FROM passengers p
     LEFT JOIN flight_segments fs ON fs.passenger_id = p.id
     LEFT JOIN flights f ON f.id = fs.flight_id
     LEFT JOIN routes rt ON rt.id = f.route_id
     LEFT JOIN airports ao ON ao.id = rt.origin_id
     LEFT JOIN airports ad ON ad.id = rt.destination_id
     WHERE p.reservation_id = ?`,
    [reservationId]
  );
  return { reserva: r[0], pasajeros: pax };
};

const cabecera = (titulo) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:#1d4ed8;color:#fff;padding:20px;text-align:center">
      <h1 style="margin:0;font-size:20px">✈ Acajutla Airlines</h1>
      <p style="margin:4px 0 0;font-size:12px;opacity:.85">SkyManager · Sistema Integral de Gestión</p>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#111827">${titulo}</h2>`;

const pie = `</div>
    <div style="background:#f3f4f6;padding:12px;text-align:center;font-size:11px;color:#6b7280">
      Este es un correo transaccional generado automáticamente por SkyManager.
    </div>
  </div>`;

const confirmacionReserva = async (reservationId) => {
  const { reserva, pasajeros } = await datosReserva(reservationId);
  const filas = pasajeros.map((p) => `
    <tr>
      <td style="padding:6px;border:1px solid #e5e7eb">${p.first_names} ${p.last_names} (${p.passenger_type})</td>
      <td style="padding:6px;border:1px solid #e5e7eb">${p.flight_number || '-'} ${p.origen || ''}→${p.destino || ''}</td>
      <td style="padding:6px;border:1px solid #e5e7eb">${p.seat || 'Por asignar'}</td>
    </tr>`).join('');
  const html = cabecera('✅ Reserva confirmada') + `
    <p style="font-size:14px;color:#374151">Hola ${reserva.c_first || ''} ${reserva.c_last || ''}, tu reserva fue creada exitosamente.</p>
    <p style="font-size:16px">Código PNR: <strong style="color:#1d4ed8;font-size:22px;letter-spacing:2px">${reserva.pnr}</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="background:#eff6ff"><th style="padding:6px;border:1px solid #e5e7eb;text-align:left">Pasajero</th><th style="padding:6px;border:1px solid #e5e7eb;text-align:left">Vuelo</th><th style="padding:6px;border:1px solid #e5e7eb;text-align:left">Asiento</th></tr>
      ${filas}
    </table>
    <p style="font-size:14px;margin-top:16px">Total estimado: <strong>$${Number(reserva.estimated_total).toFixed(2)}</strong> USD</p>
    <p style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:8px;border-radius:8px">
      ⏰ Tiempo límite de pago: ${reserva.time_limit ? new Date(reserva.time_limit).toLocaleString('es-SV') : '30 minutos'}. Después de ese tiempo el inventario se libera (RN-COM-01).
    </p>` + pie;
  return enviar(reserva.c_email, '✅ Reserva confirmada - PNR ' + reserva.pnr, html);
};

const comprobantePago = async (reservationId) => {
  const { reserva, pasajeros } = await datosReserva(reservationId);
  const [pagos] = await pool.query(
    `SELECT * FROM payments WHERE reservation_id = ? AND status = 'approved' AND type = 'payment' ORDER BY id DESC LIMIT 1`,
    [reservationId]
  );
  const pago = pagos[0] || {};
  const html = cabecera('💳 Pago recibido') + `
    <p style="font-size:14px;color:#374151">Hemos recibido tu pago correspondiente a la reserva <strong>${reserva.pnr}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Monto</td><td style="padding:6px;border:1px solid #e5e7eb"><strong>$${Number(pago.amount || reserva.paid_total || 0).toFixed(2)}</strong></td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Método</td><td style="padding:6px;border:1px solid #e5e7eb">${pago.method || '-'}</td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Referencia</td><td style="padding:6px;border:1px solid #e5e7eb">${pago.external_reference || '-'}</td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Fecha</td><td style="padding:6px;border:1px solid #e5e7eb">${pago.payment_date ? new Date(pago.payment_date).toLocaleString('es-SV') : '-'}</td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Pasajeros</td><td style="padding:6px;border:1px solid #e5e7eb">${pasajeros.length}</td></tr>
    </table>
    <p style="font-size:12px;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;padding:8px;border-radius:8px;margin-top:12px">
      Tu reserva ahora está en estado <strong>PAGADA</strong>. Puedes realizar check-in cuando la ventana esté abierta.
    </p>` + pie;
  return enviar(reserva.c_email, '💳 Pago recibido - Reserva ' + reserva.pnr, html);
};

const enviarDTE = async (uuid) => {
  const [h] = await pool.query(
    `SELECT d.*, r.pnr, c.email AS c_email, c.first_names AS c_first, c.last_names AS c_last
     FROM dte_headers d
     LEFT JOIN reservations r ON r.id = d.reservation_id
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE d.uuid_generation = ?`,
    [uuid]
  );
  if (!h.length) throw new Error('DTE no encontrado');
  const d = h[0];
  const html = cabecera('🧾 Comprobante Fiscal Electrónico') + `
    <p style="font-size:14px;color:#374151">Estimado/a ${d.c_first || ''} ${d.c_last || ''}: adjuntamos los datos de tu documento tributario electrónico.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Tipo DTE</td><td style="padding:6px;border:1px solid #e5e7eb">${d.dte_type === '01' ? 'Factura Electrónica (FE)' : d.dte_type === '03' ? 'Comprobante de Crédito Fiscal (CCFE)' : d.dte_type}</td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">N° de Control</td><td style="padding:6px;border:1px solid #e5e7eb;font-family:monospace">${d.control_number}</td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Código de Generación</td><td style="padding:6px;border:1px solid #e5e7eb;font-family:monospace;font-size:11px">${d.uuid_generation}</td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Sello de Recepción</td><td style="padding:6px;border:1px solid #e5e7eb;font-family:monospace">${d.reception_seal || 'Pendiente (contingencia)'}</td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Reserva (PNR)</td><td style="padding:6px;border:1px solid #e5e7eb">${d.pnr || '-'}</td></tr>
      <tr><td style="padding:6px;border:1px solid #e5e7eb">Total a pagar</td><td style="padding:6px;border:1px solid #e5e7eb"><strong>$${Number(d.total_to_pay).toFixed(2)}</strong></td></tr>
    </table>
    <p style="font-size:11px;color:#6b7280;margin-top:12px">Documento generado conforme a la Normativa de Cumplimiento de DTE (Anexo II). La representación gráfica PDF está disponible en el backoffice.</p>` + pie;
  return enviar(d.c_email, '🧾 DTE ' + d.control_number + ' - Acajutla Airlines', html);
};

const recordatorioPago = async (reservationId) => {
  const { reserva } = await datosReserva(reservationId);
  const saldo = Number(reserva.estimated_total) - Number(reserva.paid_total || 0);
  const html = cabecera('⏰ Recordatorio de pago') + `
    <p style="font-size:14px;color:#374151">Hola ${reserva.c_first || ''}: tu reserva <strong>${reserva.pnr}</strong> aún está pendiente de pago.</p>
    <p style="font-size:16px">Saldo pendiente: <strong style="color:#b91c1c">$${saldo.toFixed(2)}</strong></p>
    <p style="font-size:12px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;padding:8px;border-radius:8px">
      Tiempo límite: ${reserva.time_limit ? new Date(reserva.time_limit).toLocaleString('es-SV') : '-'}. Después de esa hora el inventario se libera automáticamente (RN-COM-01).
    </p>` + pie;
  return enviar(reserva.c_email, '⏰ Recordatorio de pago - Reserva ' + reserva.pnr, html);
};

module.exports = { confirmacionReserva, comprobantePago, enviarDTE, recordatorioPago };