const express = require('express');
const router = express.Router();
const controller = require('../controllers/auditController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'auditor'));
router.get('/', controller.listar);
router.get('/estadisticas', controller.estadisticas);

module.exports = router;