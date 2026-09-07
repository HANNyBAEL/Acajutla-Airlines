const express = require('express');
const router = express.Router();
const controller = require('../controllers/authController');
const { verificarToken, verificarRol } = require('../middleware/auth');
const { auditar } = require('../middleware/audit');
const { limiters } = require('../middleware/rateLimiter');

router.post('/login', limiters.login, controller.login);
router.post('/verificar-mfa', limiters.login, controller.verificarMFA);
router.post('/refresh', controller.refreshToken);
router.post('/registro', limiters.api, controller.registro);
router.get('/roles', controller.listarRoles);
router.get('/perfil', verificarToken, controller.perfil);
router.post('/logout', verificarToken, controller.logout);
router.get('/usuarios', verificarToken, verificarRol('admin'), controller.listarUsuarios);

module.exports = router;