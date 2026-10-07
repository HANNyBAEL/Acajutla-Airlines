const express = require('express');
const router = express.Router();
const controller = require('../controllers/airportsController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');

router.get('/', controller.listarAeropuertos);
router.post('/', verificarToken, verificarRol('admin', 'operations'), controller.crearAeropuerto);
router.put('/:id', verificarToken, verificarRol('admin', 'operations'), controller.actualizarAeropuerto);
router.patch('/:id/estado', verificarToken, verificarRol('admin', 'operations'), controller.cambiarEstado);
router.delete('/:id', verificarToken, verificarRol('admin', 'operations'), auditar('ELIMINAR_AEROPUERTO', 'aeropuertos'), controller.eliminarAeropuerto);

module.exports = router;
