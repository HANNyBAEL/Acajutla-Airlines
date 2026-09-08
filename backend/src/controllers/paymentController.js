const PaymentService = require('../services/paymentService');
const pagoDteService = require('../services/pagoDteService');
const pool = require('../config/db');

const procesarPago = async (req, res) => {
  try {
    const body = Object.assign({}, req.body);
    const tipo_dte = body.tipo_dte || null;
    const receptor = body.receptor || null;
    delete body.tipo_dte;
    delete body.receptor;
    const resultado = await PaymentService.procesarPago(body, req.usuario);
    const [pago] = await pool.query('SELECT * FROM payments WHERE reservation_id = ? ORDER BY id DESC LIMIT 1', [body.reservation_id]);
    let dteInfo = null;
    if (pago.length) {
      if (tipo_dte) await pool.query('UPDATE payments SET tipo_dte = ? WHERE id = ?', [tipo_dte, pago[0].id]);
      if (tipo_dte && pago[0].status === 'approved') {
        try {
          dteInfo = await pagoDteService.emitirYEnviar(pago[0].reservation_id, tipo_dte, receptor);
        } catch (e) {
          dteInfo = { error: e.message };
        }
      }
    }
    res.status(201).json({ exito: true, datos: resultado, dte: dteInfo });
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
    if (pago.length && pago[0].tipo_dte && pago[0].status === 'approved') {
      try {
        dteInfo = await pagoDteService.emitirYEnviar(pago[0].reservation_id, pago[0].tipo_dte, null);
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
      `SELECT p.*, r.pnr, u.username AS procesado_por
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
              SUM(CASE WHEN status = 'pending_confirmation' THEN 1 ELSE 0 END) AS pendientes
       FROM payments WHERE DATE(payment_date) = CURDATE()`
    );
    res.json({ exito: true, datos: rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { procesarPago: procesarPago, confirmarTransferencia: confirmarTransferencia, reembolsar: reembolsar, listar: listar, reservasPendientes: reservasPendientes, kpis: kpis };