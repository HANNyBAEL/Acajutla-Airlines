const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportesController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'auditor', 'cashier', 'operations'));
router.get('/dashboard', controller.dashboard);
router.get('/ingresos', controller.ingresos);
router.get('/ocupacion', controller.ocupacion);
router.get('/conciliacion', controller.conciliacion);
router.get('/dte', controller.dteResumen);

module.exports = router;