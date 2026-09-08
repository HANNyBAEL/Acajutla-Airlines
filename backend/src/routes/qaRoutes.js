const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

router.get('/inspecciones', verificarRol('admin', 'qa'), (req, res) => {
  res.json({ exito: true, datos: [] });
});

router.get('/incidencias', verificarRol('admin', 'qa'), (req, res) => {
  res.json({ exito: true, datos: [] });
});

module.exports = router;
