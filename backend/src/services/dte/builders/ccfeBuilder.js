const BaseDTEBuilder = require('./baseBuilder');
const { redondeoFiscal } = require('../utils');

class CCFEBuilder extends BaseDTEBuilder {
  constructor(config) { super('03', config); }

  construirCuerpo(items) {
    this.dte.cuerpoDocumento = items.map((item, idx) => {
      const precioUni = redondeoFiscal(item.precio);
      const cantidad = item.cantidad || 1;
      const montoDescu = redondeoFiscal(item.descuento || 0);
      const ventaGravada = redondeoFiscal(precioUni * cantidad - montoDescu);
      return {
        numItem: idx + 1, tipoItem: item.tipoItem || 2, codigo: item.codigo || null, codTributo: '20',
        uniMedida: 99, descripcion: item.descripcion, precioUni, montoDescu,
        ventaNoSuj: 0, ventaExenta: 0, ventaGravada, tributos: ['20']
      };
    });
    return this;
  }

  construirResumen(formaPago = '05', condicionOperacion = '1', referencia = null) {
    const cuerpo = this.dte.cuerpoDocumento;
    const totalGravada = redondeoFiscal(cuerpo.reduce((sum, item) => sum + item.ventaGravada, 0));
    const totalIVA = redondeoFiscal(totalGravada * 0.13);
    const totalPagar = redondeoFiscal(totalGravada + totalIVA);

    this.dte.resumen = {
      totalNoSuj: 0, totalExenta: 0, totalGravada, subTotalVentas: totalGravada,
      descuNoSuj: 0, descuExenta: 0, descuGravada: 0, porcentajeDescuento: 0, totalDescu: 0,
      tributos: [{ codigo: '20', descripcion: 'IVA 13%', valor: totalIVA }],
      subTotal: totalGravada, ivaPerci: 0, ivaRete: 0, totalPagar,
      totalLetras: `${totalPagar.toFixed(2)} USD`,
      condicionOperacion: parseInt(condicionOperacion),
      pagos: [{ codigo: formaPago, montoPago: totalPagar, referencia: referencia || null }],
      numPagoElectronico: referencia || null
    };
    return this;
  }

  async construirDesdeReserva(reserva, vuelo, receptor, pago) {
    await this.construirIdentificacion();
    this.construirEmisor();
    this.construirReceptor(receptor);
    this.construirDocumentosRelacionados(null);
    this.construirTerceros();
    const items = reserva.passengers.map((pax, idx) => ({ codigo: `PAX-${idx + 1}`, descripcion: `Boleto ${pax.first_names} ${pax.last_names} (${vuelo.flight_number})`, precio: reserva.price_per_passenger || 250, cantidad: 1, descuento: 0, tipoItem: 2 }));
    this.construirCuerpo(items);
    this.construirResumen(pago.forma_pago || '05', pago.condicion_operacion || '1', pago.referencia || null);
    this.construirApendice(reserva.pnr, { flight_number: vuelo.flight_number, origin: vuelo.origin, destination: vuelo.destination, departure_datetime: vuelo.departure_datetime });
    return this.obtener();
  }
}

module.exports = CCFEBuilder;