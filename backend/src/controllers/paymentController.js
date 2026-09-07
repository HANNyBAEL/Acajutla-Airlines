const PaymentService = require('../services/paymentService');
const Payment = require('../models/Payment');
const Reserva = require('../models/Reserva');
const AuditLog = require('../models/AuditLog');

const procesarPago = async (req, res) => {
  try {
    const { pnr, method, amount, payment_data } = req.body;
    const reserva = await Reserva.buscarPorPNR(pnr);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
    const resultado = await PaymentService.procesarPago({ reservation_id: reserva.id, pnr, method, amount, payment_data }, req.usuario);
    await AuditLog.registrar({ usuario_id: req.usuario.id, accion: 'PROCESAR_PAGO', modulo: 'payments', recurso_id: resultado.payment_id, ip: req.ip, resultado: resultado.status === 'approved' ? 'exito' : 'fallo', detalle: { pnr, method, amount: resultado.amount, status: resultado.status } });
    res.status(201).json({ exito: true, mensaje: resultado.status === 'approved' ? 'Pago procesado' : resultado.status === 'pending_confirmation' ? 'Pago registrado, pendiente de confirmación' : 'Pago rechazado', datos: resultado });
  } catch (error) {
    const status = error.message.includes('expirada') ? 410 : 400;
    res.status(status).json({ error: error.message });
  }
};

const confirmarTransferencia = async (req, res) => {
  try {
    const resultado = await PaymentService.confirmarTransferencia(req.params.id, req.usuario);
    await AuditLog.registrar({ usuario_id: req.usuario.id, accion: 'CONFIRMAR_TRANSFERENCIA', modulo: 'payments', recurso_id: req.params.id, ip: req.ip, resultado: 'exito' });
    res.json({ exito: true, mensaje: resultado.mensaje });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const reembolsar = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || !reason) return res.status(400).json({ error: 'amount y reason son requeridos' });
    const resultado = await PaymentService.reembolsar(req.params.id, amount, reason, req.usuario);
    await AuditLog.registrar({ usuario_id: req.usuario.id, accion: 'REEMBOLSAR_PAGO', modulo: 'payments', recurso_id: req.params.id, ip: req.ip, resultado: 'exito', detalle: { amount, reason, refund_id: resultado.refund_id } });
    res.json({ exito: true, mensaje: resultado.mensaje, datos: resultado });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const listarPagos = async (req, res) => {
  try {
    const pagos = await Payment.listar(req.query);
    res.json({ exito: true, total: pagos.length, datos: pagos });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const pagosPorReserva = async (req, res) => {
  try {
    const reserva = await Reserva.buscarPorPNR(req.params.pnr);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
    const pagos = await Payment.listar({ pnr: req.params.pnr });
    res.json({ exito: true, datos: pagos });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const obtenerPago = async (req, res) => {
  try {
    const pago = await Payment.buscarPorId(req.params.id);
    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json({ exito: true, datos: pago });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const pagosPendientes = async (req, res) => {
  try {
    const pendientes = await Payment.listarPendientes();
    res.json({ exito: true, total: pendientes.length, datos: pendientes });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const kpis = async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const kpisData = await Payment.obtenerKPIs(fecha);
    res.json({ exito: true, datos: kpisData });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { procesarPago, confirmarTransferencia, reembolsar, listarPagos, pagosPorReserva, obtenerPago, pagosPendientes, kpis };