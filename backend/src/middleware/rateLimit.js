const store = new Map();
module.exports = function rateLimit({ windowMs = 60000, max = 15 } = {}) {
  return (req, res, next) => {
    if (process.env.RATE_LIMIT_DISABLED === 'true') return next();
    const key = (req.ip || '') + '|' + (req.path || '');
    const now = Date.now();
    const rec = store.get(key);
    if (!rec || now - rec.start > windowMs) { store.set(key, { start: now, count: 1 }); return next(); }
    rec.count++;
    if (rec.count > max) return res.status(429).json({ error: 'Demasiadas solicitudes, intente más tarde' });
    next();
  };
};