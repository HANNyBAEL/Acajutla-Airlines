const rateLimitStore = new Map();

const rateLimiter = (options = {}) => {
  const {
    ventanaMs = 15 * 60 * 1000,
    maxPeticiones = 1000,
    keyGenerator = (req) => req.ip,
    mensaje = 'Demasiadas peticiones. Intenta más tarde.'
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const ahora = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetAt: ahora + ventanaMs });
      return next();
    }

    const data = rateLimitStore.get(key);

    if (ahora > data.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: ahora + ventanaMs });
      return next();
    }

    data.count++;

    if (data.count > maxPeticiones) {
      const retryAfter = Math.ceil((data.resetAt - ahora) / 1000);
      return res.status(429).json({ error: mensaje, retryAfter: retryAfter });
    }

    next();
  };
};

setInterval(() => {
  const ahora = Date.now();
  for (const [key, data] of rateLimitStore) {
    if (ahora > data.resetAt) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

const limiters = {
  login: rateLimiter({ ventanaMs: 15 * 60 * 1000, maxPeticiones: 100, mensaje: 'Demasiados intentos de login. Espera unos minutos.' }),
  api: rateLimiter({ ventanaMs: 15 * 60 * 1000, maxPeticiones: 1000, mensaje: 'Límite de peticiones excedido.' }),
  busqueda: rateLimiter({ ventanaMs: 15 * 60 * 1000, maxPeticiones: 500, mensaje: 'Demasiadas búsquedas.' }),
  dte: rateLimiter({ ventanaMs: 60 * 60 * 1000, maxPeticiones: 200, keyGenerator: (req) => 'dte:' + ((req.usuario && req.usuario.id) || req.ip), mensaje: 'Límite de emisión de DTE alcanzado.' })
};

module.exports = { rateLimiter: rateLimiter, limiters: limiters };