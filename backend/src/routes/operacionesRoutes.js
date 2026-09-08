const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

router.get('/vuelos-dia', verificarRol('admin', 'operations'), (req, res) => {
  res.json({ exito: true, datos: [] });
});

router.get('/tripulacion', verificarRol('admin', 'operations'), (req, res) => {
  res.json({ exito: true, datos: [] });
});

module.exports = router;
