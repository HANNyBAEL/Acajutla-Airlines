const express = require('express');
const router = express.Router();
const { listarClientes, crearCliente, buscar } = require('../controllers/clientesController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);
router.get('/buscar', buscar);
router.get('/', verificarRol('admin', 'operations', 'cashier', 'auditor'), listarClientes);
router.post('/', verificarRol('admin', 'operations', 'cashier'), crearCliente);

module.exports = router;