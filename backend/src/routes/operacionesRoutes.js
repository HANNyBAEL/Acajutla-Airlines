const express = require('express');
const router = express.Router();
const c = require('../controllers/operacionesController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');

router.use(verificarToken);
router.get('/tripulacion', c.listarTripulacion);
router.post('/tripulacion', verificarRol('admin', 'operations'), c.crearTripulante);
router.put('/tripulacion/:id', verificarRol('admin', 'operations'), c.actualizarTripulante);
router.post('/tripulacion/asignar', verificarRol('admin', 'operations'), c.asignarCrew);
router.get('/tripulacion/vuelo/:flightId', c.crewDeVuelo);
router.get('/clases', c.listarClases);
router.post('/clases', verificarRol('admin', 'operations'), c.crearClase);
router.post('/fares', verificarRol('admin', 'operations'), auditar('VERSIONAR_TARIFA', 'operaciones'), c.asignarFare);
router.get('/fares/vuelo/:flightId', c.faresDeVuelo);
router.get('/infraestructura', c.listarFacilities);
router.post('/infraestructura', verificarRol('admin', 'operations'), c.crearFacility);
router.get('/config', c.getConfig);
router.put('/config', verificarRol('admin'), c.updateConfig);
router.get('/trazabilidad/:uuid', c.trazabilidad);

module.exports = router;
