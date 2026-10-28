const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportesController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/dashboard', verificarRol('admin', 'auditor', 'cashier', 'operations'), controller.dashboard);
router.get('/ocupacion', verificarRol('admin', 'auditor', 'operations'), controller.ocupacion);
router.get('/ingresos', verificarRol('admin', 'auditor'), controller.ingresos);
router.get('/conciliacion', verificarRol('admin', 'auditor'), controller.conciliacion);
router.get('/dte', verificarRol('admin', 'auditor'), controller.dteResumen);

module.exports = router;
