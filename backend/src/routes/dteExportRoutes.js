const express = require('express');
const router = express.Router();
const c = require('../controllers/dteExportController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'cashier'));
router.post('/emitir', c.emitir);
router.get('/', c.listar);

module.exports = router;