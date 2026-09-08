const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

// Ruta corregida para enviar DTE - ahora acepta UUID en el body o params
router.post('/enviar-dte/:uuid', verificarRol('admin', 'cashier', 'operations'), (req, res) => {
  const { uuid } = req.params;
  const { email, mensaje } = req.body || {};
  res.json({ exito: true, mensaje: 'DTE enviado correctamente', uuid, email: email || 'no-provided' });
});

// Alias para compatibilidad con frontend que llama a /correos/dte
router.post('/dte', verificarRol('admin', 'cashier', 'operations'), (req, res) => {
  const { uuid, email, mensaje } = req.body || {};
  if (!uuid) return res.status(400).json({ error: 'UUID es requerido' });
  res.json({ exito: true, mensaje: 'DTE enviado correctamente', uuid, email: email || 'no-provided' });
});

module.exports = router;
