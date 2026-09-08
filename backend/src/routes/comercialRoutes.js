const express = require('express');
const router = express.Router();
const c = require('../controllers/comercialController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

// Waitlist
router.get('/waitlist', c.listarWaitlist);
router.post('/waitlist', verificarRol('admin', 'operations', 'cashier', 'agent'), c.agregarWaitlist);
router.put('/waitlist/:id/notificar', verificarRol('admin', 'operations', 'cashier'), c.notificarWaitlist);
router.put('/waitlist/:id/cancelar', verificarRol('admin', 'operations', 'cashier'), c.cancelarWaitlist);

// Ancillaries
router.get('/ancillaries', c.listarAncillaries);
router.post('/ancillaries', verificarRol('admin', 'operations'), c.crearAncillary);
router.post('/ancillaries/vuelo', verificarRol('admin', 'operations'), c.asignarAncillaryVuelo);
router.get('/ancillaries/vuelo/:flightId', c.ancillariesDeVuelo);
router.post('/ancillaries/reserva', verificarRol('admin', 'operations', 'cashier', 'agent'), c.agregarAncillaryReserva);
router.get('/ancillaries/reserva/:reservationId', c.ancillariesDeReserva);

// Reportes
router.get('/reportes/ocupacion', verificarRol('admin', 'operations'), c.reporteOcupacion);
router.get('/reportes/conciliacion', verificarRol('admin', 'cashier'), c.reporteConciliacion);
router.get('/reportes/ancillaries', verificarRol('admin', 'operations'), c.reporteAncillaries);
router.get('/reportes/canales', verificarRol('admin'), c.reporteCanales);
router.get('/kpi', c.dashboardKPIs);

module.exports = router;