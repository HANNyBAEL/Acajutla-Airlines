const AuditLog = require('../models/AuditLog');

const auditar = (accion, modulo) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      const resultado = res.statusCode < 400 ? 'exito' : 'fallo';

      setImmediate(async () => {
        try {
          await AuditLog.registrar({
            usuario_id: req.usuario?.id || null,
            usuario_nombre: req.usuario?.usuario || 'anonimo',
            accion,
            modulo,
            recurso_id: req.params.id || req.params.pnr || req.params.uuid || null,
            ip: req.ip,
            user_agent: req.headers['user-agent'],
            resultado,
            detalle: {
              metodo: req.method,
              ruta: req.originalUrl,
              status: res.statusCode,
              body_keys: req.body ? Object.keys(req.body) : []
            }
          });
        } catch (error) {
          console.error('❌ [Audit] Error:', error.message);
        }
      });

      return originalJson(data);
    };

    next();
  };
};

module.exports = { auditar };