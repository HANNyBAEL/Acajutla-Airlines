const express = require('express');
const router = express.Router();
const { listarClientes, crearCliente, actualizarCliente, eliminarCliente, buscar } = require('../controllers/clientesController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');

router.use(verificarToken);
router.get('/buscar', verificarRol('admin', 'cashier', 'auditor'), buscar);
router.get('/', verificarRol('admin', 'cashier', 'auditor'), listarClientes);
router.post('/', verificarRol('admin', 'cashier'), crearCliente);
router.put('/:id', verificarRol('admin', 'cashier'), actualizarCliente);
router.delete('/:id', verificarRol('admin'), auditar('ELIMINAR_CLIENTE', 'clientes'), eliminarCliente);

module.exports = router;
