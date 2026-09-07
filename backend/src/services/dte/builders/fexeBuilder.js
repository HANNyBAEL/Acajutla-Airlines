// Constructor de Factura de Exportación (FEXE) - Tipo 11
// REGLA CLAVE: Exportación, IVA 0% (tributo C3)
const BaseDTEBuilder = require('./baseBuilder');
const { redondeoFiscal } = require('../utils');
const catalogs = require('../catalogs');

class FEXEBuilder extends BaseDTEBuilder {
  constructor(config) {
    super('11', config);
  }

  /**
   * Sobrescribir receptor para agregar campos de exportación
   */
  construirReceptor(receptor) {
    super.construirReceptor(receptor);

    // Agregar campos específicos FEXE
    this.dte.receptor.codPais = receptor.codPais;
    this.dte.receptor.nombrePais = receptor.nombrePais;
    this.dte.receptor.tipoPersona = receptor.tipoPersona || 1;

    return this;
  }

  /**
   * Sobrescribir emisor para agregar campos de exportación
   */
  construirEmisor(emisorCustom = null) {
    super.construirEmisor(emisorCustom);

    const emisor = emisorCustom || this.config.emisor;
    this.dte.emisor.tipoltemExpor = emisor.tipoExportacion || 1;
    this.dte.emisor.recintoFiscal = emisor.recintoFiscal || '3'; // Aérea Comalapa
    this.dte.emisor.tipoRegimen = emisor.tipoRegimen || 'EX-1';
    this.dte.emisor.regimen = emisor.regimen || '1000000';

    return this;
  }

  construirCuerpo(items) {
    this.dte.cuerpoDocumento = items.map((item, idx) => {
      const precioUni = redondeoFiscal(item.precio);
      const cantidad = item.cantidad || 1;
      const montoDescu = redondeoFiscal(item.descuento || 0);
      const ventaGravada = redondeoFiscal(precioUni * cantidad - montoDescu);

      return {
        numItem: idx + 1,
        tipoItem: item.tipoItem || 2,
        codigo: item.codigo || null,
        codTributo: null,
        uniMedida: 99,
        descripcion: item.descripcion,
        precioUni: precioUni,
        montoDescu: montoDescu,
        ventaNoSuj: 0,
        ventaExenta: 0,
        ventaGravada: ventaGravada,
        tributos: 'C3' // IVA exportaciones 0%
      };
    });

    return this;
  }

  construirResumen(formaPago = '03', condicionOperacion = '1', referencia = null) {
    const cuerpo = this.dte.cuerpoDocumento;

    const totalGravada = redondeoFiscal(
      cuerpo.reduce((sum, item) => sum + item.ventaGravada, 0)
    );

    const subTotalVentas = totalGravada;
    const subTotal = subTotalVentas;

    // Tributos informativos (C3 = 0%)
    const tributos = [{
      codigo: 'C3',
      descripcion: 'Impuesto al Valor Agregado (exportaciones) 0%',
      valor: 0
    }];

    const seguro = 0;
    const flete = 0;
    const montoTotalOperacion = redondeoFiscal(totalGravada + seguro + flete);
    const totalPagar = montoTotalOperacion;

    this.dte.resumen = {
      totalNoSuj: 0,
      totalExenta: 0,
      totalGravada: totalGravada,
      subTotalVentas: subTotalVentas,
      descuGravada: 0,
      porcentajeDescuento: 0,
      totalDescu: 0,
      tributos: tributos,
      subTotal: subTotal,
      seguro: seguro,
      flete: flete,
      totalNoOnerosas: 0,
      totalPagar: totalPagar,
      totalLetras: require('../utils').numeroALetras(totalPagar),
      condicionOperacion: parseInt(condicionOperacion),
      pagos: [{
        codigo: formaPago,
        montoPago: totalPagar,
        referencia: referencia || null
      }],
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

    const items = reserva.pasajeros.map((pax, idx) => ({
      codigo: `PAX-${idx + 1}`,
      descripcion: `Boleto aéreo internacional ${pax.nombres} ${pax.apellidos} (${vuelo.numero_vuelo})`,
      precio: reserva.precio_por_pasajero || 350,
      cantidad: 1,
      descuento: 0,
      tipoItem: 2
    }));

    this.construirCuerpo(items);
    this.construirResumen(
      pago.forma_pago || '03',
      pago.condicion_operacion || '1',
      pago.referencia || null
    );
    this.construirApendice(reserva.pnr, {
      numero_vuelo: vuelo.numero_vuelo,
      origen: vuelo.origen,
      destino: vuelo.destino,
      fecha: vuelo.fecha_hora_salida
    });

    return this.obtener();
  }
}

module.exports = FEXEBuilder;