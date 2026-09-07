const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado', codigo: 'TOKEN_EXPIRADO' });
      }
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.usuario = decoded;
    next();
  });
};

const verificarRol = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ 
        error: 'No tiene permisos para esta acción',
        rol_requerido: roles,
        rol_actual: req.usuario?.rol
      });
    }
    next();
  };
};

const enmascararDatosSensibles = (req, res, next) => {
  if (req.body) {
    const camposSensibles = ['password', 'passwordActual', 'passwordNueva', 'doc_numero', 'numDocumento', 'numero_tarjeta', 'cvv', 'codigo_mfa'];
    req.bodyLog = { ...req.body };
    camposSensibles.forEach(campo => {
      if (req.bodyLog[campo]) {
        const val = req.bodyLog[campo];
        req.bodyLog[campo] = val.length > 4 ? '•'.repeat(val.length - 4) + val.slice(-4) : '••••';
      }
    });
  }
  next();
};

module.exports = { verificarToken, verificarRol, enmascararDatosSensibles };