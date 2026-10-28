const PaymentService = require('../services/paymentService');
const pagoDteService = require('../services/pagoDteService');
const paymentWorkflowService = require('../services/paymentWorkflowService');
const mailerService = require('../services/mailerService');
const { resolverPoliticaFacturacion } = require('../services/facturacionOrigenService');
const pool = require('../config/db');

const procesarPago = async (req, res) => {
  try {
    const resultado = await paymentWorkflowService.procesarPagoCompleto(req.body, req.usuario);
    res.status(201).json(resultado);
  } catch (e) {
    console.error('Error procesar pago:', e);
    res.status(e.code === 'RESERVATION_ALREADY_PAID' || e.code === 'FULL_BALANCE_TRANSFER_PENDING' ? 409 : 400)
      .json({ error: e.message, codigo: e.code || null });
  }
};

const confirmarTransferencia = async (req, res) => {
  try {
    const resultado = await PaymentService.confirmarTransferencia(parseInt(req.params.id, 10), req.usuario);
    const [pago] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    let dteInfo = null;
    let reciboVenta = null;
    let facturacion = null;
    if (pago.length && pago[0].status === 'approved') {
      facturacion = await resolverPoliticaFacturacion(pago[0].reservation_id);
      if (facturacion.tipo !== 'dte_salvador') {
        await pool.query('UPDATE payments SET tipo_dte = NULL WHERE id = ?', [pago[0].id]);
        if (resultado.reservation_status === 'paid' && facturacion.tipo === 'recibo_venta') {
          try { reciboVenta = await mailerService.enviarReciboVenta(pago[0].id); }
          catch (e) { reciboVenta = { enviado: false, motivo: e.message }; }
        }
      } else if (pago[0].tipo_dte && resultado.reservation_status === 'paid') {
        try {
          const receptor = typeof pago[0].receptor_dte === 'string' ? JSON.parse(pago[0].receptor_dte) : pago[0].receptor_dte;
          dteInfo = await pagoDteService.emitirYEnviar(pago[0].reservation_id, pago[0].tipo_dte, receptor || null, { requiereDeduccionFiscal: Boolean(pago[0].requiere_deduccion_fiscal) });
        } catch (e) {
          dteInfo = { error: e.message };
        }
      }
    }
    res.json({ exito: true, datos: resultado, dte: dteInfo, recibo_venta: reciboVenta, facturacion: facturacion });
  } catch (e) {
    console.error('Error confirmar transferencia:', e);
    res.status(400).json({ error: e.message });
  }
};

const reembolsar = async (req, res) => {
  try {
    const { amount, reason, refund_method } = req.body;
    const motivo = typeof reason === 'string' ? reason.trim() : '';
    if (!motivo) return res.status(400).json({ error: 'Indique el motivo del reembolso' });
    if (motivo.length > 500) return res.status(400).json({ error: 'El motivo no puede superar 500 caracteres' });
    const resultado = await PaymentService.reembolsar(parseInt(req.params.id, 10), amount, motivo, req.usuario, refund_method);
    // El reembolso ya está confirmado en la pasarela y en la base de datos.
    // Un fallo de correo no debe convertir una operación exitosa en un error.
    let correo = null;
    try {
      correo = await mailerService.enviarReembolso(resultado.refund_payment_id);
    } catch (e) {
      correo = { enviado: false, motivo: e.message };
      console.error('Error enviando confirmación de reembolso:', e);
    }
    res.json({ exito: true, datos: resultado, correo });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

const listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, r.pnr, u.username AS procesado_por,
              (SELECT COALESCE(NULLIF(CONVERT(co.code USING utf8mb4) COLLATE utf8mb4_unicode_ci, _utf8mb4'' COLLATE utf8mb4_unicode_ci), NULLIF(CONVERT(ao.country_code USING utf8mb4) COLLATE utf8mb4_unicode_ci, _utf8mb4'' COLLATE utf8mb4_unicode_ci)) FROM flight_segments fs
                JOIN flights f ON f.id = fs.flight_id JOIN routes rt ON rt.id = f.route_id
                JOIN airports ao ON ao.id = rt.origin_id LEFT JOIN countries co ON co.id = ao.country_id
                WHERE fs.reservation_id = r.id ORDER BY f.departure_datetime, fs.id LIMIT 1) AS origin_country_code,
              CASE WHEN p.type = 'payment' AND p.status = 'approved'
                THEN GREATEST(0, p.amount - COALESCE((
                  SELECT SUM(rf.amount) FROM payments rf
                  WHERE rf.original_payment_id = p.id AND rf.type = 'refund' AND rf.status = 'refunded'
                ), 0))
                ELSE 0 END AS refundable_balance
       FROM payments p
       JOIN reservations r ON r.id = p.reservation_id
       LEFT JOIN users u ON u.id = p.processed_by
       ORDER BY p.payment_date DESC LIMIT 200`
    );
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const reservasPendientes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.pnr, r.status, r.estimated_total, r.paid_total, r.time_limit,
              (r.estimated_total - r.paid_total) AS balance,
              c.first_names, c.last_names, c.email,
              (SELECT ao.iata_code FROM flight_segments fs
                JOIN flights f ON f.id = fs.flight_id JOIN routes rt ON rt.id = f.route_id
                JOIN airports ao ON ao.id = rt.origin_id
                WHERE fs.reservation_id = r.id ORDER BY f.departure_datetime, fs.id LIMIT 1) AS origin_airport_code,
              (SELECT COALESCE(NULLIF(CONVERT(co.code USING utf8mb4) COLLATE utf8mb4_unicode_ci, _utf8mb4'' COLLATE utf8mb4_unicode_ci), NULLIF(CONVERT(ao.country_code USING utf8mb4) COLLATE utf8mb4_unicode_ci, _utf8mb4'' COLLATE utf8mb4_unicode_ci)) FROM flight_segments fs
                JOIN flights f ON f.id = fs.flight_id JOIN routes rt ON rt.id = f.route_id
                JOIN airports ao ON ao.id = rt.origin_id LEFT JOIN countries co ON co.id = ao.country_id
                WHERE fs.reservation_id = r.id ORDER BY f.departure_datetime, fs.id LIMIT 1) AS origin_country_code
       FROM reservations r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE r.status IN ('pending','confirmed') AND (r.estimated_total - r.paid_total) > 0.009
         AND NOT EXISTS (
           SELECT 1 FROM payments rf
           WHERE rf.reservation_id = r.id AND rf.type = 'refund' AND rf.status = 'refunded'
         )
       ORDER BY r.time_limit ASC`
    );
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const kpis = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total_pagos,
              SUM(CASE WHEN status = 'approved' AND type = 'payment' THEN amount ELSE 0 END) AS ingresos,
              SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END) AS reembolsos,
              SUM(CASE WHEN status = 'pending_confirmation' AND method = 'transfer' AND external_reference IS NOT NULL THEN 1 ELSE 0 END) AS pendientes
       FROM payments WHERE DATE(CONVERT_TZ(payment_date, 'UTC', 'America/El_Salvador')) = DATE(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'America/El_Salvador'))`
    );
    res.json({ exito: true, datos: rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { procesarPago: procesarPago, confirmarTransferencia: confirmarTransferencia, reembolsar: reembolsar, listar: listar, reservasPendientes: reservasPendientes, kpis: kpis };
