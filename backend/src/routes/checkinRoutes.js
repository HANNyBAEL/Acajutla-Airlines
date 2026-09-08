const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

// Rutas corregidas con :segmentId en la ruta
router.post('/checkin/:segmentId', verificarRol('admin', 'operations', 'cashier'), (req, res) => {
  res.json({ exito: true, mensaje: 'Check-in realizado', segmentId: req.params.segmentId });
});

router.post('/abordar/:segmentId', verificarRol('admin', 'operations', 'cashier'), (req, res) => {
  res.json({ exito: true, mensaje: 'Pasajero abordado', segmentId: req.params.segmentId });
});

router.post('/cerrarVuelo/:flightId', verificarRol('admin', 'operations'), (req, res) => {
  res.json({ exito: true, mensaje: 'Vuelo cerrado', flightId: req.params.flightId });
});

router.post('/asignarAsiento/:segmentId', verificarRol('admin', 'operations', 'cashier'), (req, res) => {
  res.json({ exito: true, mensaje: 'Asiento asignado', segmentId: req.params.segmentId });
});

router.get('/vuelo/:flightId/pasajeros', verificarRol('admin', 'operations', 'cashier'), (req, res) => {
  res.json({ exito: true, datos: [] });
});

module.exports = router;
