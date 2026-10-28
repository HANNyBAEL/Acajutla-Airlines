const { resolverPoliticaFacturacion } = require('./facturacionOrigenService');

const validarOrigenFacturaElSalvador = async (documento, connection) => {
  if (!documento?.reservation_id) {
    throw new Error('Este documento no está vinculado a una reserva con boleto de salida de El Salvador');
  }
  const politica = await resolverPoliticaFacturacion(documento.reservation_id, connection);
  if (politica.tipo !== 'dte_salvador') {
    throw new Error('Esta operación fiscal solo está habilitada para facturas de boletos cuyo primer vuelo sale de El Salvador');
  }
  return politica;
};

module.exports = { validarOrigenFacturaElSalvador };
