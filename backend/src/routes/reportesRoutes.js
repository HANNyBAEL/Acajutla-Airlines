const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportesController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'auditor', 'cashier', 'operations'));
router.get('/dashboard', controller.dashboard);
router.get('/ocupacion', controller.ocupacion);
router.get('/ingresos', verificarRol('admin', 'auditor', 'cashier'), controller.ingresos);
router.get('/conciliacion', verificarRol('admin', 'auditor', 'cashier'), controller.conciliacion);
router.get('/dte', verificarRol('admin', 'auditor', 'cashier'), controller.dteResumen);

module.exports = router;
