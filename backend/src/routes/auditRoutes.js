const express = require('express');
const router = express.Router();
const controller = require('../controllers/auditController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'auditor'));
router.get('/modulos', controller.modulos);
router.get('/estadisticas', controller.estadisticas);
router.get('/', controller.listar);

module.exports = router;
