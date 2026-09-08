const express = require('express');
const router = express.Router();
const c = require('../controllers/notasController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'cashier'));
router.get('/', c.listar);
router.get('/origenes', c.origenes);
router.post('/', c.crear);

module.exports = router;