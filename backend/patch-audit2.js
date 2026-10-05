const fs = require('fs');
let code = fs.readFileSync('src/middleware/audit.js', 'utf8');

const newAudit = `const auditar = (accionStr, moduloStr) => {
  return async (req, res, next) => {
    if (res.locals.isAuditing) {
      if (accionStr) req.auditAction = accionStr;
      if (moduloStr) req.auditModule = moduloStr;
      return next();
    }
    res.locals.isAuditing = true;

    const originalJson = res.json.bind(res);

    res.json = async (data) => {
      if (res.locals.audited) return originalJson(data);
      res.locals.audited = true;

      const resultado = res.statusCode < 400 ? 'exito' : 'fallo';

      const segments = req.originalUrl.split('/');
      const defaultMod = segments.length > 2 ? segments[2] : 'api';
      const modulo = req.auditModule || moduloStr || defaultMod;
      const accion = req.auditAction || accionStr || (req.method + '_' + defaultMod.toUpperCase());

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
              body: req.body,
              query: req.query,
              params: req.params,
              response: data
            }
          });
        } catch (error) {
          console.error('[Audit] Error:', error.message);
        }
      });

      return originalJson(data);
    };

    next();
  };
};`;

code = code.replace(/const auditar = [\s\S]+?next\(\);\n  };\n};/, newAudit);

fs.writeFileSync('src/middleware/audit.js', code);
