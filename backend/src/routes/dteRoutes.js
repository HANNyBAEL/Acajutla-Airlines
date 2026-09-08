const express = require('express');
const router = express.Router();
const controller = require('../controllers/dteController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.post('/emitir', verificarRol('admin', 'cashier'), controller.emitirDTE);
router.get('/', verificarRol('admin', 'cashier', 'auditor'), controller.listarDTEs);
router.get('/kpis', verificarRol('admin', 'auditor'), controller.kpisFiscales);
router.get('/conciliacion', verificarRol('admin', 'auditor'), controller.conciliacionFiscal);
router.get('/reserva/:pnr', controller.dtesPorReserva);
// Rutas específicas DEBEN ir antes de la ruta genérica /:uuid
router.get('/:uuid/pdf', controller.obtenerPDF);
router.get('/:uuid/json', controller.obtenerJSON);
router.get('/:uuid', controller.obtenerDTE);

module.exports = router;