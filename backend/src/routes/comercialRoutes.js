const express = require('express');
const router = express.Router();
const c = require('../controllers/comercialController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/waitlist', c.listarWaitlist);
router.post('/waitlist', verificarRol('admin', 'operations', 'cashier', 'agent'), c.agregarWaitlist);
router.put('/waitlist/:id', verificarRol('admin', 'operations', 'cashier'), c.actualizarWaitlist);
router.get('/ancillaries', c.listarAncillaries);
router.post('/ancillaries', verificarRol('admin', 'operations'), c.crearAncillary);
router.post('/ancillaries/vuelo', verificarRol('admin', 'operations'), c.asignarAncillaryVuelo);
router.get('/ancillaries/vuelo/:flightId', c.ancillariesDeVuelo);
router.post('/ancillaries/reserva', verificarRol('admin', 'operations', 'cashier', 'agent'), c.agregarAncillaryReserva);
router.get('/ancillaries/reserva/:reservationId', c.ancillariesDeReserva);
router.get('/kpi', c.kpi);
router.get('/reportes/ocupacion', verificarRol('admin', 'operations'), c.reporteOcupacion);
router.get('/reportes/ancillaries', verificarRol('admin', 'operations'), c.reporteAncillaries);
router.get('/reportes/canales', verificarRol('admin'), c.reporteCanales);
router.get('/reportes/conciliacion', verificarRol('admin', 'cashier'), c.reporteConciliacion);

module.exports = router;