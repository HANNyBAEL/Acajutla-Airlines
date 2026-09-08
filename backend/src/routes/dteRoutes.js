const express = require('express');
const router = express.Router();
const controller = require('../controllers/dteController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');

router.use(verificarToken);
router.post('/emitir', verificarRol('admin', 'cashier'), auditar('EMITIR_DTE', 'dte'), controller.emitir);
router.get('/', verificarRol('admin', 'cashier', 'auditor'), controller.listar);
router.get('/kpis', verificarRol('admin', 'cashier', 'auditor'), controller.kpis);
router.get('/:uuid', verificarRol('admin', 'cashier', 'auditor'), controller.obtener);

const rgController = require('../controllers/rgController');
router.get('/:uuid/pdf', rgController.pdf);
router.get('/:uuid/json', rgController.json);

module.exports = router;