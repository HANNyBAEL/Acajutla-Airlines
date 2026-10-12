const crypto = require('crypto');

const autenticarCheckoutWeb = (req, res, next) => {
  const esperado = process.env.WEB_CHECKOUT_SHARED_SECRET || '';
  if (Buffer.byteLength(esperado) < 32) {
    return res.status(503).json({ error: 'Checkout web no está configurado en el servidor.' });
  }
  const recibido = String(req.headers['x-web-checkout-secret'] || '');
  const esperadoBuffer = Buffer.from(esperado);
  const recibidoBuffer = Buffer.from(recibido);
  if (recibidoBuffer.length !== esperadoBuffer.length || !crypto.timingSafeEqual(recibidoBuffer, esperadoBuffer)) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  next();
};

module.exports = { autenticarCheckoutWeb };
