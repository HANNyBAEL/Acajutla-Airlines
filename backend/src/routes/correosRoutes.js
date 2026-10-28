const express = require('express');
const router = express.Router();
const c = require('../controllers/correosController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
// La creación de reservas puede enviar su confirmación automáticamente.
router.post('/confirmacion-reserva', verificarRol('admin', 'cashier', 'auditor'), c.enviarReservaPorCuerpo);
router.use(verificarRol('admin', 'cashier', 'auditor'));
router.get('/', c.listar);
router.get('/:id', c.obtener);
// Compatibilidad con los envíos automáticos que incluyen el identificador
// en el cuerpo de la petición.
router.post('/comprobante-pago', c.enviarPagoPorCuerpo);
router.post('/enviar-reserva/:id', c.enviarReserva);
router.post('/enviar-pago/:id', c.enviarPago);
router.post('/enviar-dte/:uuid', c.enviarDte);
router.post('/:id/reenviar', c.reenviar);

module.exports = router;
