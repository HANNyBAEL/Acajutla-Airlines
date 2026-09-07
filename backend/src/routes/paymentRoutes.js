const express = require('express');
const router = express.Router();
const controller = require('../controllers/paymentController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');

router.use(verificarToken);
router.post('/procesar', verificarRol('admin', 'cashier'), auditar('PROCESAR_PAGO', 'pagos'), controller.procesarPago);
router.post('/:id/confirmar', verificarRol('admin', 'cashier'), auditar('CONFIRMAR_PAGO', 'pagos'), controller.confirmarTransferencia);
router.post('/:id/reembolsar', verificarRol('admin', 'cashier'), auditar('REEMBOLSAR_PAGO', 'pagos'), controller.reembolsar);
router.get('/reservas-pendientes', verificarRol('admin', 'cashier', 'operations', 'auditor'), controller.reservasPendientes);
router.get('/kpis', verificarRol('admin', 'cashier', 'auditor'), controller.kpis);
router.get('/', verificarRol('admin', 'cashier', 'auditor'), controller.listarPagos);

module.exports = router;