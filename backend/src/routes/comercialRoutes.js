const express = require('express');
const router = express.Router();
const c = require('../controllers/comercialController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/waitlist', verificarRol('admin', 'operations', 'cashier', 'corporate_agent'), c.listarWaitlist);
router.post('/waitlist', verificarRol('admin', 'operations', 'cashier', 'corporate_agent'), c.agregarWaitlist);
router.put('/waitlist/:id', verificarRol('admin', 'operations', 'cashier'), c.actualizarWaitlist);
router.get('/ancillaries', verificarRol('admin', 'operations', 'cashier'), c.listarAncillaries);
router.get('/reservas-para-ancillaries', verificarRol('admin', 'cashier'), c.reservasParaAncillaries);
router.post('/ancillaries', verificarRol('admin', 'operations'), c.crearAncillary);
router.put('/ancillaries/:id', verificarRol('admin', 'operations'), c.actualizarAncillary);
router.post('/ancillaries/vuelo', verificarRol('admin', 'operations'), c.asignarAncillaryVuelo);
router.get('/ancillaries/vuelo/:flightId', verificarRol('admin', 'operations', 'cashier'), c.ancillariesDeVuelo);
router.post('/ancillaries/reserva', verificarRol('admin', 'cashier'), c.agregarAncillaryReserva);
router.get('/ancillaries/reserva/:reservationId/vuelos', verificarRol('admin', 'cashier'), c.vuelosDeReservaAncillaries);
router.get('/ancillaries/reserva/:reservationId', verificarRol('admin', 'cashier'), c.ancillariesDeReserva);
router.get('/kpi', verificarRol('admin', 'operations', 'cashier'), c.kpi);
router.get('/reportes/ocupacion', verificarRol('admin', 'operations'), c.reporteOcupacion);
router.get('/reportes/ancillaries', verificarRol('admin', 'operations'), c.reporteAncillaries);
router.get('/reportes/canales', verificarRol('admin'), c.reporteCanales);
router.get('/reportes/conciliacion', verificarRol('admin', 'cashier'), c.reporteConciliacion);

module.exports = router;
