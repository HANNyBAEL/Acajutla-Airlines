const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');

router.use(verificarToken);
router.post('/procesar', auditar('PROCESAR_PAGO', 'payments'), controller.procesarPago);
router.post('/:id/confirmar', verificarRol('admin', 'cashier'), auditar('CONFIRMAR_TRANSFERENCIA', 'payments'), controller.confirmarTransferencia);
router.post('/:id/reembolsar', verificarRol('admin', 'cashier'), auditar('REEMBOLSAR_PAGO', 'payments'), controller.reembolsar);
router.get('/', verificarRol('admin', 'cashier', 'auditor'), controller.listarPagos);
router.get('/pendientes', verificarRol('admin', 'cashier'), controller.pagosPendientes);
router.get('/kpis', verificarRol('admin', 'auditor'), controller.kpis);
router.get('/reserva/:pnr', controller.pagosPorReserva);
router.get('/:id', controller.obtenerPago);

module.exports = router;