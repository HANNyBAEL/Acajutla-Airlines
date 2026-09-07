const BaseDTEBuilder = require('./baseBuilder');
const { redondeoFiscal } = require('../utils');

class FEBuilder extends BaseDTEBuilder {
  constructor(config) { super('01', config); }

  construirCuerpo(items) {
    this.dte.cuerpoDocumento = items.map((item, idx) => {
      const precioUni = redondeoFiscal(item.precio);
      const cantidad = item.cantidad || 1;
      const montoDescu = redondeoFiscal(item.descuento || 0);
      const subtotal = redondeoFiscal(precioUni * cantidad - montoDescu);
      const ventaGravada = redondeoFiscal(subtotal / 1.13);
      const ivaItem = redondeoFiscal(ventaGravada * 0.13);
      return {
        numItem: idx + 1, tipoItem: item.tipoItem || 2, codigo: item.codigo || null, codTributo: null,
        uniMedida: 99, descripcion: item.descripcion, precioUni, montoDescu,
        ventaNoSuj: 0, ventaExenta: 0, ventaGravada, tributos: null, ivaItem
      };
    });
    return this;
  }

  construirResumen(formaPago = '03', condicionOperacion = '1', referencia = null) {
    const cuerpo = this.dte.cuerpoDocumento;
    const totalGravada = redondeoFiscal(cuerpo.reduce((sum, item) => sum + item.ventaGravada, 0));
    const subTotalVentas = totalGravada;
    const totalIVA = redondeoFiscal(totalGravada * 0.13);
    const totalPagar = totalGravada;

    this.dte.resumen = {
      totalNoSuj: 0, totalExenta: 0, totalGravada, subTotalVentas,
      descuNoSuj: 0, descuExenta: 0, descuGravada: 0, porcentajeDescuento: 0, totalDescu: 0,
      tributos: null, subTotal: subTotalVentas, ivaRete: 0, totalIva: totalIVA, totalPagar,
      totalLetras: `${totalPagar.toFixed(2)} USD`,
      condicionOperacion: parseInt(condicionOperacion),
      pagos: [{ codigo: formaPago, montoPago: totalPagar, referencia: referencia || null, plazo: null, periodo: null }],
      numPagoElectronico: referencia || null
    };
    return this;
  }

  async construirDesdeReserva(reserva, vuelo, receptor, pago) {
    await this.construirIdentificacion({ tipoOperacion: 1 });
    this.construirEmisor();
    this.construirReceptor(receptor);
    this.construirDocumentosRelacionados(null);
    this.construirTerceros();

    const items = reserva.passengers.map((pax, idx) => ({
      codigo: `PAX-${idx + 1}`, descripcion: `Boleto aéreo ${pax.first_names} ${pax.last_names} (${vuelo.flight_number})`,
      precio: reserva.price_per_passenger || 250, cantidad: 1, descuento: 0, tipoItem: 2
    }));

    this.construirCuerpo(items);
    this.construirResumen(pago.forma_pago || '03', pago.condicion_operacion || '1', pago.referencia || null);
    this.construirApendice(reserva.pnr, { flight_number: vuelo.flight_number, origin: vuelo.origin, destination: vuelo.destination, departure_datetime: vuelo.departure_datetime });
    return this.obtener();
  }
}

module.exports = FEBuilder;