const PaymentService = require('./paymentService');
const pagoDteService = require('./pagoDteService');
const mailerService = require('./mailerService');
const { resolverPoliticaFacturacion } = require('./facturacionOrigenService');
const pool = require('../config/db');

/** Comparte el mismo procesamiento y emisión del backoffice con el checkout web. */
const procesarPagoCompleto = async (entrada, usuario) => {
  const body = { ...entrada };
  const tipoDteSolicitado = body.tipo_dte || '01';
  const receptor = body.receptor || null;
  const requiereDeduccionFiscal = body.requiere_deduccion_fiscal === true;
  delete body.tipo_dte;
  delete body.receptor;
  delete body.requiere_deduccion_fiscal;

  const politicaFacturacion = await resolverPoliticaFacturacion(body.reservation_id);
  const tipoDte = politicaFacturacion.tipo === 'dte_salvador' ? tipoDteSolicitado : null;
  const resultado = await PaymentService.procesarPago({
    ...body,
    receptorDte: receptor,
    requiereDeduccionFiscal
  }, usuario);
  const [pagos] = await pool.query('SELECT * FROM payments WHERE id = ?', [resultado.payment_id]);
  let dteInfo = null;
  let reciboVenta = null;

  if (pagos.length) {
    const pago = pagos[0];
    await pool.query('UPDATE payments SET tipo_dte = ? WHERE id = ?', [tipoDte, pago.id]);
    if (pago.status === 'approved' && resultado.reservation_status === 'paid') {
      if (politicaFacturacion.tipo === 'recibo_venta') {
        try {
          reciboVenta = await mailerService.enviarReciboVenta(pago.id);
        } catch (error) {
          reciboVenta = { enviado: false, motivo: error.message };
        }
      } else if (politicaFacturacion.tipo === 'revision_manual') {
        reciboVenta = { enviado: false, motivo: politicaFacturacion.mensaje, requiere_revision: true };
      } else {
        try {
          dteInfo = await pagoDteService.emitirYEnviar(pago.reservation_id, tipoDte, receptor, { requiereDeduccionFiscal });
        } catch (error) {
          dteInfo = { error: error.message };
        }
      }
    }
  }

  return { exito: true, datos: resultado, dte: dteInfo, recibo_venta: reciboVenta, facturacion: politicaFacturacion };
};

module.exports = { procesarPagoCompleto };
