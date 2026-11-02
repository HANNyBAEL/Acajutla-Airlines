const AuditLog = require('../models/AuditLog');

const METODOS_DE_CAMBIO = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUDITADOS_MANUALMENTE = new Set([
  'POST /api/auth/login',
  'POST /api/auth/verificar-mfa',
  'POST /api/auth/logout'
]);
const RUTAS_NO_AUDITAR = new Set(['POST /api/auth/refresh']);
const RUTAS_LECTURA_AUDITABLES = [
  /^\/api\/auth\/perfil\/?$/,
  /^\/api\/auth\/usuarios\/?$/,
  /^\/api\/(?:clientes|reservas)\/?$/,
  /^\/api\/reservas\/[^/]+\/?$/,
  /^\/api\/pasajeros\/reserva\/[^/]+\/?$/,
  /^\/api\/empleados(?:\/[^/]+)?\/?$/,
  /^\/api\/pagos(?:\/(?:reservas-pendientes|kpis))?\/?$/,
  /^\/api\/dte\/?$/,
  /^\/api\/dte\/kpis\/?$/,
  /^\/api\/dte\/[^/]+(?:\/(?:pdf|json))?\/?$/,
  /^\/api\/checkin(?:\/.*)?\/?$/,
  /^\/api\/correos(?:\/[^/]+)?\/?$/,
  /^\/api\/comercial\/ancillaries\/reserva\/[^/]+(?:\/vuelos)?\/?$/,
  /^\/api\/operaciones\/(?:tripulacion(?:\/vuelo\/[^/]+)?|config)\/?$/,
  /^\/api\/aeronaves(?:\/[^/]+)?\/?$/,
  /^\/api\/fiscalidad(?:\/.*)?\/?$/,
  /^\/api\/reportes\/(?:dashboard|ocupacion|ingresos|conciliacion|dte)\/?$/,
  /^\/api\/operaciones\/trazabilidad\/[^/]+\/?$/
];
const CLAVES_SECRETAS = /password|contrasena|token|authorization|secret|secreto|cvv|cvc|(?:mfa|otp|verificacion|verification).*(?:codigo|code)|(?:codigo|code).*(?:mfa|otp|verificacion|verification)|numero_tarjeta|card_number|referencia|cuenta|^card$|^tarjeta$/i;
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
  if (valor == null) return valor;
  if (CLAVES_SECRETAS.test(clave)) return '[REDACTADO]';
  if (CLAVES_DOCUMENTO.test(clave) || CLAVES_TELEFONO.test(clave)) return ocultar(valor);
  if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
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
  const rutaControlador = req.auditContext?.route
    ? `${req.auditContext.baseUrl || ''}${req.auditContext.route}`
    : req.route?.path || req.path || '';
  const ruta = String(rutaControlador)
    .replace(/:[^/]+/g, 'recurso')
    .split('/')
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toUpperCase();
  return `${metodo}_${modulo}_${ruta || 'RECURSO'}`.slice(0, 100);
};

const resumirRespuesta = (respuesta) => {
  if (respuesta == null || typeof respuesta !== 'object') return { contenido: String(respuesta ?? '') };
  const resumen = {};
  ['exito', 'mensaje', 'error', 'codigo'].forEach((clave) => {
    if (respuesta[clave] != null && ['string', 'number', 'boolean'].includes(typeof respuesta[clave])) {
      resumen[clave] = sanear(respuesta[clave], clave);
    }
  });
  const datos = respuesta.datos;
  if (Array.isArray(datos)) resumen.cantidad_registros = datos.length;
  else if (datos && typeof datos === 'object') {
    const ids = ['id', 'reservation_id', 'pnr', 'uuid', 'flight_id', 'segment_id', 'estado', 'status', 'total'];
    const recurso = Object.fromEntries(ids.filter((clave) => datos[clave] != null).map((clave) => [clave, sanear(datos[clave], clave)]));
    if (Object.keys(recurso).length) resumen.recurso = recurso;
  }
  return resumen;
};

const obtenerRecursoId = (req) => {
  const claves = ['id', 'pnr', 'uuid', 'flightId', 'segmentId', 'reservationId', 'reservation_id', 'flight_id', 'segment_id'];
  for (const origen of [req.auditContext?.params || {}, req.params || {}, req.body || {}, req.auditRespuesta?.recurso || {}]) {
    for (const clave of claves) {
      if (origen[clave] != null && String(origen[clave]).trim()) return String(origen[clave]).slice(0, 100);
    }
  }
  return null;
};

const crearDetalle = (req, res, duracionMs) => {
  const path = String(req.originalUrl || req.path || '').split('?')[0];
  const detalle = {
    usuario: {
      id: req.usuario?.id || null,
      nombre: req.usuario?.usuario || req.usuario?.username || 'anonimo',
      rol: req.usuario?.rol || req.usuario?.role || null
    },
    tipo_evento: req.method === 'GET' ? 'consulta' : 'cambio',
    metodo: req.method,
    ruta: path,
    ruta_controlador: req.auditContext?.route
      ? `${req.auditContext.baseUrl || ''}${req.auditContext.route}`
      : req.route?.path || null,
    status: res.statusCode,
    duracion_ms: duracionMs,
    campos_enviados: req.method === 'GET' ? [] : Object.keys(req.body || {}),
    body: sanear(req.body || {}),
    query: sanear(req.query || {}),
    params: sanear(req.auditContext?.params || req.params || {}),
    respuesta: req.auditRespuesta || null,
    tipo_respuesta: res.getHeader('content-type') || null,
    bytes_respuesta: Number(res.getHeader('content-length')) || null
  };
  const serializado = JSON.stringify(detalle);
  if (serializado.length <= 12000) return detalle;
  return {
    usuario: detalle.usuario,
    tipo_evento: detalle.tipo_evento,
    metodo: detalle.metodo,
    ruta: detalle.ruta,
    ruta_controlador: detalle.ruta_controlador,
    status: detalle.status,
    duracion_ms: detalle.duracion_ms,
    campos_enviados: detalle.campos_enviados,
    body: `${JSON.stringify(detalle.body).slice(0, 6500)}…[truncado]`,
    query: `${JSON.stringify(detalle.query).slice(0, 1500)}…[truncado]`,
    params: detalle.params,
    respuesta: detalle.respuesta,
    tipo_respuesta: detalle.tipo_respuesta,
    bytes_respuesta: detalle.bytes_respuesta
  };
};

/**
 * Registra cambios y consultas sensibles seleccionadas.
 * Se usa `finish` para cubrir respuestas JSON, vacías (204), archivos y errores.
 */
const auditarCambios = (req, res, next) => {
  const ruta = `${req.method} ${req.path}`;
  if (RUTAS_NO_AUDITAR.has(ruta)) return next();
  if (AUDITADOS_MANUALMENTE.has(`${req.method} ${req.path}`)) return next();
  const esCambio = METODOS_DE_CAMBIO.has(req.method);
  const esLectura = req.method === 'GET' && RUTAS_LECTURA_AUDITABLES.some((patron) => patron.test(req.path));
  if (!esCambio && !esLectura) return next();

  const inicio = process.hrtime.bigint();
  const capturarContexto = () => {
    if (req.auditContext) return;
    req.auditContext = {
      baseUrl: req.baseUrl || '',
      route: req.route?.path || null,
      params: { ...(req.params || {}) }
    };
  };
  const jsonOriginal = res.json.bind(res);
  res.json = (respuesta) => {
    capturarContexto();
    req.auditRespuesta = resumirRespuesta(respuesta);
    return jsonOriginal(respuesta);
  };
  const endOriginal = res.end;
  res.end = function (...args) {
    capturarContexto();
    return endOriginal.apply(this, args);
  };

  res.once('finish', () => {
    const modulo = req.auditModulo || obtenerModulo(req);
    const accion = req.auditAccion || obtenerAccion(req, modulo);
    const recursoId = obtenerRecursoId(req);
    const resultado = res.statusCode < 400 ? 'exito' : 'fallo';
    const duracionMs = Number(process.hrtime.bigint() - inicio) / 1e6;

    AuditLog.registrar({
      usuario_id: req.usuario?.id || null,
      usuario_nombre: req.usuario?.usuario || req.usuario?.username || 'anonimo',
      accion,
      modulo,
      recurso_id: recursoId == null ? null : String(recursoId).slice(0, 100),
      ip: req.ip,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
      resultado,
      detalle: crearDetalle(req, res, Math.round(duracionMs * 100) / 100)
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
