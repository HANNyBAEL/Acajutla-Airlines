const express = require('express');
const router = express.Router();
const controller = require('../controllers/pasajerosController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/reserva/:reservation_id', verificarRol('admin', 'cashier', 'airport_staff', 'auditor'), controller.listarPorReserva);
router.get('/documento/:doc_type/:doc_number', verificarRol('admin', 'cashier', 'auditor'), controller.buscarPorDocumento);
router.put('/:id', verificarRol('admin', 'cashier'), controller.actualizarPasajero);

module.exports = router;
