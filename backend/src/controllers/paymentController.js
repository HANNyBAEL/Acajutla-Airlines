const PaymentService = require('../services/paymentService');
const pagoDteService = require('../services/pagoDteService');
const paymentWorkflowService = require('../services/paymentWorkflowService');
const pool = require('../config/db');

const procesarPago = async (req, res) => {
  try {
    const resultado = await paymentWorkflowService.procesarPagoCompleto(req.body, req.usuario);
    res.status(201).json(resultado);
  } catch (e) {
    console.error('Error procesar pago:', e);
    res.status(400).json({ error: e.message });
  }
};

const confirmarTransferencia = async (req, res) => {
  try {
    const resultado = await PaymentService.confirmarTransferencia(parseInt(req.params.id, 10), req.usuario);
    const [pago] = await pool.query('SELECT * FROM payments WHERE id = ?', [req.params.id]);
    let dteInfo = null;
    if (pago.length && pago[0].tipo_dte && pago[0].status === 'approved' && resultado.reservation_status === 'paid') {
      try {
        const receptor = typeof pago[0].receptor_dte === 'string' ? JSON.parse(pago[0].receptor_dte) : pago[0].receptor_dte;
        dteInfo = await pagoDteService.emitirYEnviar(pago[0].reservation_id, pago[0].tipo_dte, receptor || null, { requiereDeduccionFiscal: Boolean(pago[0].requiere_deduccion_fiscal) });
      } catch (e) {
        dteInfo = { error: e.message };
      }
    }
    res.json({ exito: true, datos: resultado, dte: dteInfo });
  } catch (e) {
    console.error('Error confirmar transferencia:', e);
    res.status(400).json({ error: e.message });
  }
};

const reembolsar = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Indique el motivo del reembolso' });
    const resultado = await PaymentService.reembolsar(parseInt(req.params.id, 10), amount, reason, req.usuario);
    res.json({ exito: true, datos: resultado });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

const listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, r.pnr, u.username AS procesado_por,
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
              c.first_names, c.last_names, c.email
       FROM reservations r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE r.status IN ('pending','confirmed') AND (r.estimated_total - r.paid_total) > 0.009
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
