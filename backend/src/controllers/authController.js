const AuthService = require('../services/authService');
const { Usuario, ROLES_VALIDOS } = require('../models/Usuario');
const AuditLog = require('../models/AuditLog');

const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const resultado = await AuthService.login(usuario, password, ip, userAgent);
    await AuditLog.registrar({ usuario_id: resultado.usuarioId || null, usuario_nombre: usuario, accion: 'LOGIN', modulo: 'auth', ip, user_agent: userAgent, resultado: 'exito' });
    if (resultado.requiereMFA) return res.json({ exito: true, requiereMFA: true, usuarioId: resultado.usuarioId, mensaje: resultado.mensaje });
    res.json({ exito: true, datos: resultado });
  } catch (error) {
    await AuditLog.registrar({ usuario_nombre: req.body.usuario || 'desconocido', accion: 'LOGIN', modulo: 'auth', ip: req.ip, resultado: 'fallo', detalle: { error: error.message } });
    const status = error.message.includes('bloqueada') ? 423 : 401;
    res.status(status).json({ error: error.message });
  }
};

const verificarMFA = async (req, res) => {
  try {
    const { usuarioId, codigo } = req.body;
    if (!usuarioId || !codigo) return res.status(400).json({ error: 'usuarioId y codigo son requeridos' });
    const resultado = await AuthService.verificarMFA(usuarioId, codigo);
    await AuditLog.registrar({ usuario_id: usuarioId, accion: 'MFA_VERIFICADO', modulo: 'auth', ip: req.ip, resultado: 'exito' });
    res.json({ exito: true, datos: resultado });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido' });
    const resultado = await AuthService.renovarToken(refreshToken);
    res.json({ exito: true, datos: resultado });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    await AuthService.logout(req.usuario.id);
    await AuditLog.registrar({ usuario_id: req.usuario.id, accion: 'LOGOUT', modulo: 'auth', ip: req.ip, resultado: 'exito' });
    res.json({ exito: true, mensaje: 'Sesión cerrada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

const registro = async (req, res) => {
  try {
    const { usuario: username, correo: email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'usuario, correo y password son requeridos' });
    const resultado = await AuthService.registro({ username, email, password });
    res.status(201).json({ exito: true, mensaje: 'Usuario registrado', datos: resultado });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const perfil = async (req, res) => {
  try {
    const usuario = await Usuario.buscarPorId(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ exito: true, datos: AuthService.sanitizarUsuario(usuario) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.listar(req.query);
    res.json({ exito: true, total: usuarios.length, datos: usuarios });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

const listarRoles = async (req, res) => {
  res.json({ exito: true, datos: ROLES_VALIDOS.map(rol => ({ codigo: rol, nombre: { admin: 'Administrador', operations: 'Operaciones', cashier: 'Cajero', airport_staff: 'Personal Aeroportuario', customer: 'Cliente', corporate_agent: 'Agente Corporativo', auditor: 'Auditor Fiscal' }[rol] })) });
};

module.exports = { login, verificarMFA, refreshToken, logout, registro, perfil, listarUsuarios, listarRoles };