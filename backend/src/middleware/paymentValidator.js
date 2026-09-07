// Middleware de validación de datos de pago
const PaymentGateway = require('../services/paymentGateway');

/**
 * Valida datos de tarjeta de crédito/débito
 */
const validarTarjeta = (req, res, next) => {
  const { datos_pago } = req.body;

  if (!datos_pago) {
    return res.status(400).json({ error: 'datos_pago es requerido' });
  }

  const { numero_tarjeta, titular, cvv, expiracion } = datos_pago;

  // Validar número de tarjeta
  if (!numero_tarjeta) {
    return res.status(400).json({ error: 'Número de tarjeta requerido' });
  }

  const numeroLimpio = numero_tarjeta.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(numeroLimpio)) {
    return res.status(400).json({ error: 'Número de tarjeta inválido' });
  }

  if (!PaymentGateway.validarLuhn(numeroLimpio)) {
    return res.status(400).json({ error: 'Número de tarjeta inválido (Luhn)' });
  }

  // Validar titular
  if (!titular || titular.length < 3) {
    return res.status(400).json({ error: 'Nombre del titular requerido' });
  }

  // Validar CVV
  if (!cvv || !/^\d{3,4}$/.test(cvv)) {
    return res.status(400).json({ error: 'CVV inválido' });
  }

  // Validar expiración
  if (!expiracion || !PaymentGateway.validarExpiracion(expiracion)) {
    return res.status(400).json({ error: 'Fecha de expiración inválida o tarjeta vencida' });
  }

  // Enmascarar datos sensibles antes de continuar
  req.body.datos_pago.numero_tarjeta = numeroLimpio;
  req.body.datos_pago.cvv = '••••'; // No guardar CVV (PCI-DSS)

  next();
};

/**
 * Valida datos de transferencia
 */
const validarTransferencia = (req, res, next) => {
  const { datos_pago } = req.body;

  if (!datos_pago?.banco || !datos_pago?.referencia) {
    return res.status(400).json({ 
      error: 'banco y referencia son requeridos para transferencia' 
    });
  }

  next();
};

/**
 * Valida método de pago y delega al validador específico
 */
const validarSegunMetodo = (req, res, next) => {
  const { metodo } = req.body;

  if (!metodo) {
    return res.status(400).json({ error: 'metodo de pago es requerido' });
  }

  const metodosValidos = ['tarjeta', 'transferencia', 'efectivo', 'paypal'];
  if (!metodosValidos.includes(metodo)) {
    return res.status(400).json({ 
      error: `Método inválido. Permitidos: ${metodosValidos.join(', ')}` 
    });
  }

  if (metodo === 'tarjeta') {
    return validarTarjeta(req, res, next);
  }

  if (metodo === 'transferencia') {
    return validarTransferencia(req, res, next);
  }

  next();
};

module.exports = {
  validarTarjeta,
  validarTransferencia,
  validarSegunMetodo
};