const express = require('express');
const router = express.Router();
const c = require('../controllers/fiscalController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'cashier', 'auditor'));
router.post('/aplicar', c.aplicar);
router.post('/evento-retorno', c.eventoRetorno);
router.post('/validar-invalidacion', c.validarInvalidacion);

module.exports = router;