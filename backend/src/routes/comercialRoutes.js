const express = require('express');
const router = express.Router();
const c = require('../controllers/comercialController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/servicios', c.listarServicios);
router.post('/servicios', verificarRol('admin', 'operations'), c.crearServicio);
router.get('/reservas/:id/servicios', c.listarServiciosReserva);
router.post('/reservas/:id/servicios', verificarRol('admin', 'cashier', 'operations'), c.agregarServicioReserva);
router.get('/waitlist', c.listarWaitlist);
router.post('/waitlist', verificarRol('admin', 'cashier', 'operations'), c.crearWaitlist);
router.patch('/waitlist/:id', verificarRol('admin', 'cashier', 'operations'), c.actualizarWaitlist);

module.exports = router;