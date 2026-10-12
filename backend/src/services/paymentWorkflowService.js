const PaymentService = require('./paymentService');
const pagoDteService = require('./pagoDteService');
const pool = require('../config/db');

/** Comparte el mismo procesamiento y emisión del backoffice con el checkout web. */
const procesarPagoCompleto = async (entrada, usuario) => {
  const body = { ...entrada };
  const tipoDte = body.tipo_dte || '01';
  const receptor = body.receptor || null;
  const requiereDeduccionFiscal = body.requiere_deduccion_fiscal === true;
  delete body.tipo_dte;
  delete body.receptor;
  delete body.requiere_deduccion_fiscal;

  const resultado = await PaymentService.procesarPago({
    ...body,
    receptorDte: receptor,
    requiereDeduccionFiscal
  }, usuario);
  const [pagos] = await pool.query('SELECT * FROM payments WHERE id = ?', [resultado.payment_id]);
  let dteInfo = null;

  if (pagos.length) {
    const pago = pagos[0];
    if (tipoDte) await pool.query('UPDATE payments SET tipo_dte = ? WHERE id = ?', [tipoDte, pago.id]);
    if (pago.status === 'approved' && resultado.reservation_status === 'paid') {
      try {
        dteInfo = await pagoDteService.emitirYEnviar(pago.reservation_id, tipoDte, receptor, { requiereDeduccionFiscal });
      } catch (error) {
        dteInfo = { error: error.message };
      }
    }
  }

  return { exito: true, datos: resultado, dte: dteInfo };
};

module.exports = { procesarPagoCompleto };
