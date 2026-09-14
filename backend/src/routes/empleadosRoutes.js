const express = require('express');
const router = express.Router();
const controller = require('../controllers/empleadosController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/', verificarRol('admin'), controller.listar);
router.get('/:id', verificarRol('admin'), controller.obtener);
router.post('/', verificarRol('admin'), controller.crear);
router.put('/:id', verificarRol('admin'), controller.actualizar);
router.patch('/:id/status', verificarRol('admin'), controller.cambiarEstado);

module.exports = router;