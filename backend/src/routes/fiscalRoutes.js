const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

router.get('/reportes', verificarRol('admin', 'auditor'), (req, res) => {
  res.json({ exito: true, datos: [] });
});

router.get('/conciliacion', verificarRol('admin', 'auditor'), (req, res) => {
  res.json({ exito: true, datos: [] });
});

module.exports = router;
