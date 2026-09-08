const express = require('express');
const router = express.Router();
const c = require('../controllers/paymentController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

router.get('/reservas-pendientes', verificarRol('admin', 'cashier', 'operations', 'auditor'), c.reservasPendientes);
router.get('/kpis', verificarRol('admin', 'cashier', 'auditor'), c.kpis);
router.get('/', verificarRol('admin', 'cashier', 'auditor'), c.listar);
router.post('/procesar', verificarRol('admin', 'cashier'), c.procesarPago);
router.post('/:id/confirmar', verificarRol('admin', 'cashier'), c.confirmarTransferencia);
router.post('/:id/reembolsar', verificarRol('admin', 'cashier'), c.reembolsar);

module.exports = router;