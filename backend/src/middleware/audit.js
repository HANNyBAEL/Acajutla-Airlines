const AuditLog = require('../models/AuditLog');

const METODOS_DE_CAMBIO = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUDITADOS_MANUALMENTE = new Set([
  'POST /api/auth/login',
  'POST /api/auth/verificar-mfa',
  'POST /api/auth/logout'
]);
const CLAVES_SECRETAS = /password|contrasena|token|authorization|secret|secreto|cvv|cvc|codigo|otp|numero_tarjeta|card_number/i;
const CLAVES_DOCUMENTO = /doc|documento|dui|nit|passport|pasaporte/i;
const CLAVES_CORREO = /email|correo/i;
const CLAVES_TELEFONO = /telefono|phone|celular|movil/i;
const MAX_PROFUNDIDAD = 8;

const ocultar = (valor) => {
  const texto = String(valor);
  if (texto.length <= 4) return '****';
  return `${'*'.repeat(Math.min(texto.length - 4, 32))}${texto.slice(-4)}`;
};

const enmascararCorreo = (valor) => {
  const [usuario, dominio] = String(valor).split('@');
  if (!dominio) return ocultar(valor);
  return `${usuario.slice(0, 1)}***@${dominio}`;
};

const sanear = (valor, clave = '', profundidad = 0) => {
  if (valor == null || typeof valor === 'number' || typeof valor === 'boolean') return valor;
  if (CLAVES_SECRETAS.test(clave)) return '[REDACTADO]';
  if (typeof valor === 'string') {
    if (CLAVES_CORREO.test(clave)) return enmascararCorreo(valor);
    if (CLAVES_DOCUMENTO.test(clave) || CLAVES_TELEFONO.test(clave)) return ocultar(valor);
    return valor.length > 1000 ? `${valor.slice(0, 1000)}…[truncado]` : valor;
  }
  if (profundidad >= MAX_PROFUNDIDAD) return '[profundidad máxima]';
  if (Array.isArray(valor)) return valor.slice(0, 100).map((item) => sanear(item, clave, profundidad + 1));
  if (typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).slice(0, 100).map(([key, nested]) => [key, sanear(nested, key, profundidad + 1)])
    );
  }
  return String(valor);
};

const obtenerModulo = (req) => {
  const segmentos = String(req.originalUrl || '').split('?')[0].split('/').filter(Boolean);
  return (segmentos[0] === 'api' ? segmentos[1] : segmentos[0]) || 'sistema';
};

const obtenerAccion = (req, modulo) => {
  const metodo = String(req.method || 'CAMBIO').toUpperCase();
  const ruta = String(req.route?.path || req.path || '')
    .replace(/:[^/]+/g, 'recurso')
    .split('/')
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toUpperCase();
  return `${metodo}_${modulo}_${ruta || 'RECURSO'}`.slice(0, 100);
};

const crearDetalle = (req, res) => {
  const detalle = {
    metodo: req.method,
    ruta: req.path,
    status: res.statusCode,
    body: sanear(req.body || {}),
    query: sanear(req.query || {}),
    params: sanear(req.params || {})
  };
  const serializado = JSON.stringify(detalle);
  if (serializado.length <= 12000) return detalle;
  return {
    metodo: detalle.metodo,
    ruta: detalle.ruta,
    status: detalle.status,
    body: `${JSON.stringify(detalle.body).slice(0, 8000)}…[truncado]`,
    query: `${JSON.stringify(detalle.query).slice(0, 2000)}…[truncado]`,
    params: detalle.params
  };
};

/**
 * Registra una entrada por cada solicitud que pueda cambiar datos.
 * Se usa `finish` para cubrir respuestas JSON, vacías (204), texto y errores.
 */
const auditarCambios = (req, res, next) => {
  if (!METODOS_DE_CAMBIO.has(req.method)) return next();
  if (AUDITADOS_MANUALMENTE.has(`${req.method} ${req.path}`)) return next();

  res.once('finish', () => {
    const modulo = req.auditModulo || obtenerModulo(req);
    const accion = req.auditAccion || obtenerAccion(req, modulo);
    const recursoId = req.params?.id || req.params?.pnr || req.params?.uuid || req.body?.id || null;
    const resultado = res.statusCode < 400 ? 'exito' : 'fallo';

    AuditLog.registrar({
      usuario_id: req.usuario?.id || null,
      usuario_nombre: req.usuario?.usuario || req.usuario?.username || 'anonimo',
      accion,
      modulo,
      recurso_id: recursoId == null ? null : String(recursoId).slice(0, 100),
      ip: req.ip,
      user_agent: req.headers['user-agent'],
      resultado,
      detalle: crearDetalle(req, res)
    }).catch((error) => {
      console.error('❌ [Audit] Error:', error.message);
    });
  });

  next();
};

// Mantiene las etiquetas explícitas existentes sin crear una segunda entrada.
const auditar = (accion, modulo) => (req, res, next) => {
  req.auditAccion = accion;
  req.auditModulo = modulo;
  next();
};

module.exports = { auditar, auditarCambios };
