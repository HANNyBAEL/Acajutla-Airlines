const express = require('express');
const router = express.Router();
const controller = require('../controllers/airportsController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.get('/', controller.listarAeropuertos);
router.post('/', verificarToken, verificarRol('admin', 'operations'), controller.crearAeropuerto);
router.patch('/:id/estado', verificarToken, verificarRol('admin', 'operations'), controller.cambiarEstado);

module.exports = router;