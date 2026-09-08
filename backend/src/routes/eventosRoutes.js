const express = require('express');
const router = express.Router();
const c = require('../controllers/eventosController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');

router.use(verificarToken, verificarRol('admin', 'cashier'));
router.get('/pendientes', c.pendientes);
router.get('/eventos', c.eventos);
router.post('/emitir-contingencia', auditar('EMITIR_DTE_CONTINGENCIA', 'dte'), c.emitirContingencia);
router.post('/evento-contingencia', auditar('EVENTO_CONTINGENCIA', 'dte'), c.eventoContingencia);
router.post('/invalidar/:uuid', auditar('INVALIDAR_DTE', 'dte'), c.invalidar);

module.exports = router;