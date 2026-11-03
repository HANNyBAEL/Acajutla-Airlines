const express = require('express');
const router = express.Router();
const c = require('../controllers/fiscalController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.post('/aplicar', verificarRol('admin'), c.aplicar);
router.post('/evento-retorno', verificarRol('admin', 'cashier'), c.eventoRetorno);
// Validar el plazo no cambia datos; los auditores pueden usar esta consulta.
router.post('/validar-invalidacion', verificarRol('admin', 'cashier', 'auditor'), c.validarInvalidacion);

module.exports = router;
