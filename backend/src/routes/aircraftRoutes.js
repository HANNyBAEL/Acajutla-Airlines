const express = require('express');
const router = express.Router();
const controller = require('../controllers/aircraftController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/', verificarRol('admin', 'operations'), controller.listar);
router.get('/tipos', controller.listarTipos);
router.post('/', verificarRol('admin', 'operations'), controller.crear);
router.post('/tipos', verificarRol('admin', 'operations'), controller.crearTipo);
router.put('/:id', verificarRol('admin', 'operations'), controller.actualizar);
router.put('/tipos/:id', verificarRol('admin', 'operations'), controller.actualizarTipo);
// Los tipos no se eliminan: sólo se activan/desactivan.
router.patch('/tipos/:id/estado', verificarRol('admin', 'operations'), controller.cambiarEstadoTipo);

module.exports = router;