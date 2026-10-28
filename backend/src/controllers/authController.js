const AuthService = require('../services/authService');
const { Usuario, ROLES_VALIDOS } = require('../models/Usuario');
const AuditLog = require('../models/AuditLog');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const ROLES_BACKOFFICE = ROLES_VALIDOS.filter((role) => role !== 'customer');
const buscarDuplicadoCuenta = async ({ username, email }) => {
  const [rows] = await pool.query(
    `SELECT id, username, email, role, status,
            LOWER(TRIM(username)) = LOWER(?) AS coincide_usuario,
            LOWER(TRIM(email)) = LOWER(?) AS coincide_correo
     FROM users
     WHERE LOWER(TRIM(username)) = LOWER(?) OR LOWER(TRIM(email)) = LOWER(?)
     LIMIT 2`,
    [username, email, username, email]
  );
  return rows;
};
const mensajeDuplicadoCuenta = (rows) => {
  const usuario = rows.find((row) => Number(row.coincide_usuario));
  const correo = rows.find((row) => Number(row.coincide_correo));
  if (correo?.role === 'customer') return 'Este correo ya pertenece a una cuenta de cliente. Las cuentas de clientes no aparecen en Usuarios y accesos.';
  if (usuario && correo) return 'El nombre de usuario y el correo ya pertenecen a una cuenta existente.';
  if (correo) return 'Este correo ya pertenece a una cuenta existente.';
  if (usuario) return 'Este nombre de usuario ya está registrado.';
  return 'El usuario o correo ya están registrados.';
};
const cuentaClienteConvertible = (rows) => {
  const cliente = rows.find((row) => Number(row.coincide_correo) && row.role === 'customer');
  const usuarioOcupado = rows.some((row) => Number(row.coincide_usuario) && Number(row.id) !== Number(cliente?.id));
  return cliente && !usuarioOcupado ? cliente : null;
};

const validarCuenta = ({ username, email, role, password }, incluirPassword) => {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{3,40}$/.test(username.trim())) return 'El usuario debe tener entre 3 y 40 caracteres (letras, números, punto, guion o guion bajo)';
  if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Ingrese un correo electrónico válido';
  if (!ROLES_BACKOFFICE.includes(role)) return 'Seleccione un rol válido para el sistema';
  if (incluirPassword && typeof password !== 'string') return 'La contraseña es obligatoria';
  if (typeof password === 'string' && password.length > 0 && password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
  return null;
};

const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const resultado = await AuthService.login(usuario, password, ip, userAgent);
    await AuditLog.registrar({ usuario_id: resultado.usuarioId || null, usuario_nombre: usuario, accion: 'LOGIN', modulo: 'auth', ip, user_agent: userAgent, resultado: 'exito' });
    if (resultado.requiereMFA) return res.json({
      exito: true,
      requiereMFA: true,
      usuarioId: resultado.usuarioId,
      mensaje: resultado.mensaje,
      ...(resultado.codigoMfaSimulado ? { codigoMfaSimulado: resultado.codigoMfaSimulado } : {})
    });
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

const crearUsuario = async (req, res) => {
  const datos = {
    username: typeof req.body.username === 'string' ? req.body.username.trim() : '',
    email: typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '',
    password: req.body.password,
    role: req.body.role
  };
  const errorValidacion = validarCuenta(datos, true);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  try {
    const existentes = await buscarDuplicadoCuenta(datos);
    if (existentes.length) {
      const cliente = cuentaClienteConvertible(existentes);
      if (cliente) return res.status(409).json({
        error: 'Este correo ya pertenece a una cuenta de cliente. Puedes convertir esa cuenta al rol de backoffice seleccionado.',
        conversion: { user_id: cliente.id }
      });
      return res.status(409).json({ error: mensajeDuplicadoCuenta(existentes) });
    }
    const passwordHash = await bcrypt.hash(datos.password, 12);
    const mfaRequerido = ['admin', 'cashier'].includes(datos.role) ? 1 : 0;
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, employee_id, mfa_enabled, mfa_required, status, created_at)
       VALUES (?, ?, ?, ?, NULL, 0, ?, 'active', NOW())`,
      [datos.username, datos.email, passwordHash, datos.role, mfaRequerido]
    );
    res.status(201).json({ exito: true, datos: { id: result.insertId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const existentes = await buscarDuplicadoCuenta(datos);
      const cliente = cuentaClienteConvertible(existentes);
      if (cliente) return res.status(409).json({
        error: 'Este correo ya pertenece a una cuenta de cliente. Puedes convertir esa cuenta al rol de backoffice seleccionado.',
        conversion: { user_id: cliente.id }
      });
      return res.status(409).json({ error: mensajeDuplicadoCuenta(existentes) });
    }
    console.error('Error crear usuario de sistema:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
};

const actualizarUsuario = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const datos = {
    username: typeof req.body.username === 'string' ? req.body.username.trim() : '',
    email: typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '',
    password: req.body.password,
    role: req.body.role
  };
  const errorValidacion = validarCuenta(datos, false);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID de usuario inválido' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT id, role, status FROM users WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const actual = rows[0];
    if (Number(req.usuario.id) === id && datos.role !== actual.role) {
      await connection.rollback();
      return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
    }
    const [duplicados] = await connection.query('SELECT id FROM users WHERE (username = ? OR email = ?) AND id <> ? LIMIT 1', [datos.username, datos.email, id]);
    if (duplicados.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'El usuario o correo ya están registrados' });
    }
    if (actual.role === 'admin' && actual.status === 'active' && datos.role !== 'admin') {
      const [admins] = await connection.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND status = 'active'");
      if (Number(admins[0]?.total || 0) <= 1) {
        await connection.rollback();
        return res.status(409).json({ error: 'Debe permanecer al menos un administrador activo' });
      }
    }

    const campos = ['username = ?', 'email = ?', 'role = ?', 'mfa_required = ?'];
    const valores = [datos.username, datos.email, datos.role, ['admin', 'cashier'].includes(datos.role) ? 1 : 0];
    if (typeof datos.password === 'string' && datos.password.length > 0) {
      campos.push('password_hash = ?', 'password_changed_at = NOW()');
      valores.push(await bcrypt.hash(datos.password, 12));
    }
    valores.push(id);
    await connection.query(`UPDATE users SET ${campos.join(', ')} WHERE id = ?`, valores);
    if (typeof datos.password === 'string' && datos.password.length > 0) {
      await connection.query('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
    }
    await connection.commit();
    res.json({ exito: true, mensaje: 'Usuario actualizado' });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El usuario o correo ya están registrados' });
    console.error('Error actualizar usuario de sistema:', error);
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  } finally {
    connection.release();
  }
};

const cambiarEstadoUsuario = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { status } = req.body;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID de usuario inválido' });
  if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'El estado debe ser activo o inactivo' });
  if (Number(req.usuario.id) === id && status !== 'active') return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT id, role, status FROM users WHERE id = ? FOR UPDATE', [id]);
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const actual = rows[0];
    if (actual.role === 'admin' && actual.status === 'active' && status !== 'active') {
      const [admins] = await connection.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND status = 'active'");
      if (Number(admins[0]?.total || 0) <= 1) {
        await connection.rollback();
        return res.status(409).json({ error: 'Debe permanecer al menos un administrador activo' });
      }
    }
    await connection.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    if (status !== 'active') {
      await connection.query('DELETE FROM refresh_tokens WHERE user_id = ?', [id]);
      await connection.query('UPDATE mfa_codes SET used = TRUE WHERE user_id = ?', [id]);
    }
    await connection.commit();
    res.json({ exito: true, mensaje: 'Estado del usuario actualizado' });
  } catch (error) {
    await connection.rollback();
    console.error('Error cambiar estado de usuario:', error);
    res.status(500).json({ error: 'No se pudo actualizar el estado del usuario' });
  } finally {
    connection.release();
  }
};

const listarRoles = async (req, res) => {
  const nombres = {
    admin: 'Administrador',
    operations: 'Operaciones',
    cashier: 'Cajero',
    airport_staff: 'Personal aeroportuario',
    corporate_agent: 'Agente corporativo',
    auditor: 'Auditor',
  };
  const rolesBackoffice = ROLES_VALIDOS.filter((rol) => rol !== 'customer');
  res.json({ exito: true, datos: rolesBackoffice.map((rol) => ({ codigo: rol, nombre: nombres[rol] })) });
};

module.exports = { login, verificarMFA, refreshToken, logout, registro, perfil, listarUsuarios, crearUsuario, actualizarUsuario, cambiarEstadoUsuario, listarRoles };
