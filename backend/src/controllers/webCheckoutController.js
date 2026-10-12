const paymentWorkflowService = require('../services/paymentWorkflowService');

const procesarPago = async (req, res) => {
  const body = req.body || {};
  const reservationId = Number(body.reservation_id);
  const amount = Number(body.amount);
  const methods = ['card', 'transfer', 'paypal'];

  if (!Number.isSafeInteger(reservationId) || reservationId <= 0) {
    return res.status(400).json({ error: 'Reserva inválida.' });
  }
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
    return res.status(400).json({ error: 'Monto de pago inválido.' });
  }
  if (!methods.includes(body.method)) {
    return res.status(400).json({ error: 'Método de pago no soportado.' });
  }

  if (body.method === 'card') {
    const card = body.card || {};
    if (typeof card.numero !== 'string' || typeof card.cvv !== 'string' || typeof card.expiracion !== 'string') {
      return res.status(400).json({ error: 'Datos de tarjeta incompletos.' });
    }
  }
  if (body.method === 'transfer' && (typeof body.referencia !== 'string' || !body.referencia.trim() || body.referencia.length > 100)) {
    return res.status(400).json({ error: 'Referencia de transferencia inválida.' });
  }

  const metadataRecibida = body.paymentMetadata && typeof body.paymentMetadata === 'object' ? body.paymentMetadata : {};
  const metadata = {};
  if (['web_checkout', 'bank_transfer', 'digital_wallet'].includes(metadataRecibida.channel)) metadata.channel = metadataRecibida.channel;
  if (['BANCO_AGRICOLA', 'BANCO_CUSCATLAN', 'BANCO_DAVIVIENDA', 'BANCO_PROMERICA'].includes(metadataRecibida.bank)) metadata.bank = metadataRecibida.bank;
  if (['TIGO_MONEY', 'CHIVO_WALLET', 'PAYPAL'].includes(metadataRecibida.wallet_provider)) metadata.wallet_provider = metadataRecibida.wallet_provider;

  const receptorRecibido = body.receptor && typeof body.receptor === 'object' ? body.receptor : {};
  const receptor = {};
  if (typeof receptorRecibido.nombre === 'string' && receptorRecibido.nombre.length <= 250) receptor.nombre = receptorRecibido.nombre;
  if (typeof receptorRecibido.correo === 'string' && receptorRecibido.correo.length <= 150) receptor.correo = receptorRecibido.correo;
  if (['13', '36', '3'].includes(String(receptorRecibido.tipoDocumento))) receptor.tipoDocumento = String(receptorRecibido.tipoDocumento);
  if (typeof receptorRecibido.numDocumento === 'string' && receptorRecibido.numDocumento.length <= 20) receptor.numDocumento = receptorRecibido.numDocumento;

  try {
    const resultado = await paymentWorkflowService.procesarPagoCompleto({
      reservation_id: reservationId,
      amount,
      method: body.method,
      card: body.method === 'card' ? body.card : undefined,
      referencia: body.method === 'transfer' ? body.referencia.trim() : undefined,
      paymentMetadata: metadata,
      tipo_dte: '01',
      receptor
    }, null);
    res.status(201).json(resultado);
  } catch (error) {
    console.warn('Checkout web rechazado:', error.message);
    res.status(400).json({ error: error.message || 'No se pudo procesar el pago.' });
  }
};

module.exports = { procesarPago };
