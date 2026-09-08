const express = require('express');
const router = express.Router();
const c = require('../controllers/correosController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'cashier', 'operations', 'auditor'));
router.get('/', c.listar);
// Compatibilidad con los envíos automáticos que incluyen el identificador
// en el cuerpo de la petición.
router.post('/confirmacion-reserva', c.enviarReservaPorCuerpo);
router.post('/comprobante-pago', c.enviarPagoPorCuerpo);
router.post('/enviar-reserva/:id', c.enviarReserva);
router.post('/enviar-pago/:id', c.enviarPago);
router.post('/enviar-dte/:uuid', c.enviarDte);
router.post('/:id/reenviar', c.reenviar);

module.exports = router;
