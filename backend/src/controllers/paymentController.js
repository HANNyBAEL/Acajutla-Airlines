const pool = require('../config/db');
const PaymentService = require('../services/paymentService');

const procesarPago = async (req, res) => {
  try {
    const { reservation_id, method, amount, card, referencia } = req.body;
    if (!reservation_id || !method) return res.status(400).json({ error: 'reservation_id y method son obligatorios' });
    const resultado = await PaymentService.procesarPago({ reservation_id: reservation_id, method: method, amount: amount, card: card, referencia: referencia }, req.usuario);
    res.status(201).json({ exito: true, mensaje: 'Pago procesado', datos: resultado });
  } catch (e) {
    console.error('Error procesar pago:', e);
    res.status(400).json({ error: e.message });
  }
};

const confirmarTransferencia = async (req, res) => {
  try {
    const resultado = await PaymentService.confirmarTransferencia(parseInt(req.params.id, 10), req.usuario);
    res.json({ exito: true, mensaje: 'Transferencia confirmada', datos: resultado });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

const reembolsar = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Indique el motivo del reembolso' });
    const resultado = await PaymentService.reembolsar(parseInt(req.params.id, 10), amount, reason, req.usuario);
    res.json({ exito: true, mensaje: 'Reembolso procesado', datos: resultado });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

const listarPagos = async (req, res) => {
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
    console.error('Error listar pagos:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const reservasPendientes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.pnr, r.status, r.estimated_total, r.paid_total, r.time_limit, r.created_at,
              (r.estimated_total - r.paid_total) AS balance,
              c.first_names, c.last_names
       FROM reservations r
       LEFT JOIN customers c ON c.id = r.customer_id
       WHERE r.status IN ('pending','confirmed') AND (r.estimated_total - r.paid_total) > 0.009
       ORDER BY r.time_limit ASC`
    );
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) {
    console.error('Error reservas pendientes:', e);
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

module.exports = { procesarPago: procesarPago, confirmarTransferencia: confirmarTransferencia, reembolsar: reembolsar, listarPagos: listarPagos, reservasPendientes: reservasPendientes, kpis: kpis };