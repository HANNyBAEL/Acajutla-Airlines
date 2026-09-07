const express = require('express');
const router = express.Router();
const { listarClientes, buscarClientePorDocumento, crearCliente } = require('../controllers/clientesController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/', verificarRol('admin', 'operations', 'cashier', 'auditor'), listarClientes);
router.get('/buscar', verificarRol('admin', 'operations', 'cashier', 'auditor'), buscarClientePorDocumento);
router.post('/', verificarRol('admin', 'operations', 'cashier'), crearCliente);

module.exports = router;