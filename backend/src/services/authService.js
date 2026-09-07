const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Usuario } = require('../models/Usuario');
const { enviarCorreo } = require('../config/brevo');

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = '7d';
const MAX_INTENTOS_FALLIDOS = 1000; // Bloqueo desactivado en desarrollo

class AuthService {
  static async login(credencial, password, ip, userAgent) {
    const usuario = await Usuario.buscarPorCredencial(credencial);
    if (!usuario) throw new Error('Credenciales inválidas');

    const bloqueado = false; // Bloqueo desactivado en desarrollo
    if (bloqueado) throw new Error('Cuenta bloqueada temporalmente. Intenta en 15 minutos.');

    const passwordValido = await Usuario.verificarPassword(password, usuario.password_hash);
    if (!passwordValido) {
      await Usuario.incrementarIntentosFallidos(usuario.id);
      if ((usuario.failed_attempts || 0) + 1 >= MAX_INTENTOS_FALLIDOS) {
        await Usuario.bloquearUsuario(usuario.id);
        throw new Error('Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.');
      }
      throw new Error('Credenciales inválidas');
    }

    await Usuario.resetearIntentosFallidos(usuario.id);

    if (usuario.mfa_required || usuario.mfa_enabled) {
      const codigoMFA = await Usuario.generarCodigoMFA(usuario.id);
      try {
        await enviarCorreo(usuario.email, 'Código de verificación - Acajutla Airlines',
          `<div><h2>Código de Verificación</h2><p>Hola ${usuario.username},</p><p>Tu código: <strong style="font-size:32px;letter-spacing:8px;">${codigoMFA}</strong></p><p>Expira en 5 minutos.</p></div>`);
      } catch (error) { console.error('Error al enviar MFA:', error.message); }
      return { requiereMFA: true, usuarioId: usuario.id, mensaje: 'Código MFA enviado al correo' };
    }

    const tokens = await AuthService.generarTokens(usuario);
    await Usuario.actualizarUltimoLogin(usuario.id);
    return { requiereMFA: false, ...tokens, usuario: AuthService.sanitizarUsuario(usuario) };
  }

  static async verificarMFA(usuarioId, codigo) {
    const valido = await Usuario.verificarCodigoMFA(usuarioId, codigo);
    if (!valido) throw new Error('Código MFA inválido o expirado');
    const usuario = await Usuario.buscarPorId(usuarioId);
    if (!usuario) throw new Error('Usuario no encontrado');
    const tokens = await AuthService.generarTokens(usuario);
    await Usuario.actualizarUltimoLogin(usuarioId);
    return { ...tokens, usuario: AuthService.sanitizarUsuario(usuario) };
  }

  static async generarTokens(usuario) {
    const accessToken = jwt.sign({ id: usuario.id, usuario: usuario.username, rol: usuario.role, nombre: usuario.empleado_nombres ? `${usuario.empleado_nombres} ${usuario.empleado_apellidos}` : usuario.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ id: usuario.id, tipo: 'refresh' }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Usuario.guardarRefreshToken(usuario.id, tokenHash, expiraEn);
    return { accessToken, refreshToken };
  }

  static async renovarToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
      if (decoded.tipo !== 'refresh') throw new Error('Token inválido');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const tokenBD = await Usuario.validarRefreshToken(decoded.id, tokenHash);
      if (!tokenBD) throw new Error('Refresh token revocado o expirado');
      const usuario = await Usuario.buscarPorId(decoded.id);
      if (!usuario || usuario.status !== 'active') throw new Error('Usuario inactivo');
      const tokens = await AuthService.generarTokens(usuario);
      return { ...tokens, usuario: AuthService.sanitizarUsuario(usuario) };
    } catch (error) {
      if (error.name === 'TokenExpiredError') throw new Error('Refresh token expirado. Inicia sesión nuevamente.');
      throw new Error('Refresh token inválido');
    }
  }

  static async logout(userId) {
    await Usuario.revocarRefreshToken(userId);
  }

  static async registro(data) {
    AuthService.validarPassword(data.password);
    const usuario = await Usuario.crear({ username: data.username, email: data.email, password: data.password, role: 'customer' });
    const usuarioCompleto = await Usuario.buscarPorId(usuario.id);
    const tokens = await AuthService.generarTokens(usuarioCompleto);
    return { ...tokens, usuario: AuthService.sanitizarUsuario(usuarioCompleto) };
  }

  static validarPassword(password) {
    if (!password || password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
    if (!/[A-Z]/.test(password)) throw new Error('Debe contener al menos una mayúscula');
    if (!/[a-z]/.test(password)) throw new Error('Debe contener al menos una minúscula');
    if (!/[0-9]/.test(password)) throw new Error('Debe contener al menos un número');
    return true;
  }

  static sanitizarUsuario(usuario) {
    const { password_hash, blocked_until, failed_attempts, ...seguro } = usuario;
    return seguro;
  }
}

module.exports = AuthService;