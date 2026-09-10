const express = require('express');
const router = express.Router();
const c = require('../controllers/notificacionesController');
const { verificarToken } = require('../middleware/auth');

router.use(verificarToken);
router.get('/', c.listar);

module.exports = router;