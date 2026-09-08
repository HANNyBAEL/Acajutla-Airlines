const express = require('express');
const router = express.Router();
const c = require('../controllers/checkinController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'operations', 'airport_staff'));
router.get('/vuelos', c.vuelosAbiertos);
router.get('/reserva/:pnr', c.reservaPorPnr);
router.get('/mapa/:flightId', c.mapaAsientos);
router.get('/manifiesto/:flightId', c.manifiesto);
router.post('/asiento/:segmentId', c.asignarAsiento);
router.post('/checkin/:segmentId', c.hacerCheckin);
router.post('/abordar/:segmentId', c.abordar);
router.post('/vuelo/:id/cerrar', c.cerrarVuelo);

module.exports = router;