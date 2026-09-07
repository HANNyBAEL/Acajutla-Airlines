const express = require('express');
const router = express.Router();
const controller = require('../controllers/reservasController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/expiradas', verificarRol('admin', 'operations', 'cashier', 'auditor'), (req, res) => res.json({ exito: true, datos: [] }));
router.get('/:pnr', controller.consultarReserva);
router.post('/', verificarRol('admin', 'cashier', 'operations'), controller.crearReserva);
router.get('/', verificarRol('admin', 'cashier', 'operations', 'auditor'), controller.listarReservas);
router.post('/:pnr/cancelar', verificarRol('admin', 'cashier', 'operations'), controller.cancelarReserva);

module.exports = router;