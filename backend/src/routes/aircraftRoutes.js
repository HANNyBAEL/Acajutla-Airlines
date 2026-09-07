const express = require('express');
const router = express.Router();
const controller = require('../controllers/aircraftController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/', verificarRol('admin', 'operations'), controller.listar);
router.get('/tipos', controller.listarTipos);
router.post('/', verificarRol('admin', 'operations'), controller.crear);
router.post('/tipos', verificarRol('admin', 'operations'), controller.crearTipo);

module.exports = router;