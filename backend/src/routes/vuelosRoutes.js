const express = require('express');
const router = express.Router();
const controller = require('../controllers/vuelosController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');

router.get('/buscar', controller.buscarVuelos);
router.get('/itinerarios', controller.buscarItinerarios);
router.get('/aeronaves', verificarToken, controller.listarAeronaves);
router.get('/', verificarToken, verificarRol('admin', 'operations', 'cashier', 'auditor'), controller.listarVuelos);
router.post('/', verificarToken, verificarRol('admin', 'operations'), auditar('CREAR_VUELO', 'vuelos'), controller.crearVuelo);
router.patch('/:id/cancelar', verificarToken, verificarRol('admin', 'operations'), auditar('CANCELAR_VUELO', 'vuelos'), controller.cancelarVuelo);
router.patch('/:id/reprogramar', verificarToken, verificarRol('admin', 'operations'), auditar('REPROGRAMAR_VUELO', 'vuelos'), controller.reprogramarVuelo);
router.get('/:id', verificarToken, controller.obtenerVuelo);

module.exports = router;