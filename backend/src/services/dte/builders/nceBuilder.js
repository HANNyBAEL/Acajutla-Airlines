// Constructor de Nota de Crédito Electrónica (NCE) - Tipo 05
// REGLA CLAVE: Debe relacionar documento original (FE o CCFE)
const BaseDTEBuilder = require('./baseBuilder');
const { redondeoFiscal } = require('../utils');

class NCEBuilder extends BaseDTEBuilder {
  constructor(config) {
    super('05', config);
  }

  /**
   * Sobrescribir para requerir documento relacionado
   */
  async construirIdentificacion(datos = {}) {
    await super.construirIdentificacion(datos);
    return this;
  }

  /**
   * Documentos relacionados es OBLIGATORIO para NCE
   */
  construirDocumentosRelacionados(docOriginal) {
    if (!docOriginal) {
      throw new Error('NCE requiere documento original relacionado');
    }

    this.dte.documentoRelacionado = [{
      tipoDocumento: docOriginal.tipoDte, // '01' o '03'
      tipoGeneracion: 2, // Electrónico
      numeroDocumento: docOriginal.codigoGeneracion, // UUID del DTE original
      fechaEmision: docOriginal.fecEmi
    }];

    return this;
  }

  construirCuerpo(items) {
    this.dte.cuerpoDocumento = items.map((item, idx) => {
      const precioUni = redondeoFiscal(item.precio);
      const cantidad = item.cantidad || 1;
      const ventaGravada = redondeoFiscal(precioUni * cantidad);
      
      // Para NCE que ajusta CCFE: tributo 20
      // Para NCE que ajusta FE: tributos null
      const esCCFE = this.dte.documentoRelacionado?.[0]?.tipoDocumento === '03';

      return {
        numItem: idx + 1,
        tipoItem: item.tipoItem || 2,
        codigo: item.codigo || null,
        numeroDocumento: this.dte.documentoRelacionado[0].numeroDocumento,
        codTributo: esCCFE ? '20' : null,
        uniMedida: 99,
        descripcion: item.descripcion,
        precioUni: precioUni,
        montoDescu: 0,
        ventaNoSuj: 0,
        ventaExenta: 0,
        ventaGravada: ventaGravada,
        tributos: esCCFE ? ['20'] : null
      };
    });

    return this;
  }

  construirResumen(formaPago = '99', condicionOperacion = '1') {
    const cuerpo = this.dte.cuerpoDocumento;
    const totalGravada = redondeoFiscal(
      cuerpo.reduce((sum, item) => sum + item.ventaGravada, 0)
    );

    const esCCFE = this.dte.documentoRelacionado?.[0]?.tipoDocumento === '03';
    const totalIVA = esCCFE ? redondeoFiscal(totalGravada * 0.13) : 0;

    const subTotalVentas = totalGravada;
    const montoTotalOperacion = esCCFE
      ? redondeoFiscal(subTotalVentas + totalIVA)
      : subTotalVentas;

    const tributos = esCCFE ? [{
      codigo: '20',
      descripcion: 'Impuesto al Valor Agregado 13%',
      valor: totalIVA
    }] : null;

    this.dte.resumen = {
      totalNoSuj: 0,
      totalExenta: 0,
      totalGravada: totalGravada,
      subTotalVentas: subTotalVentas,
      descuNoSuj: 0,
      descuExenta: 0,
      descuGravada: 0,
      totalDescu: 0,
      tributos: tributos,
      subTotal: subTotalVentas,
      ivaPerci: 0,
      ivaRete: 0,
      totalIva: totalIVA,
      totalPagar: montoTotalOperacion,
      totalLetras: require('../utils').numeroALetras(montoTotalOperacion),
      condicionOperacion: parseInt(condicionOperacion),
      pagos: [{
        codigo: formaPago,
        montoPago: montoTotalOperacion,
        referencia: null
      }]
    };

    return this;
  }

  async construirDesdeReembolso(reembolso, dteOriginal, vuelo) {
    await this.construirIdentificacion();
    this.construirEmisor();
    this.construirReceptor(reembolso.receptor);
    this.construirDocumentosRelacionados({
      tipoDte: dteOriginal.tipo_dte,
      codigoGeneracion: dteOriginal.uuid_generacion,
      fecEmi: dteOriginal.fecha_emision
    });
    this.construirTerceros();

    const items = reembolso.items.map(item => ({
      codigo: item.codigo,
      descripcion: item.descripcion || `Reembolso parcial - ${dteOriginal.numero_control}`,
      precio: item.monto,
      cantidad: 1,
      tipoItem: 2
    }));

    this.construirCuerpo(items);
    this.construirResumen('99', '1'); // Saldo a favor
    this.construirApendice(reembolso.pnr, {
      numero_vuelo: vuelo?.numero_vuelo,
      origen: vuelo?.origen,
      destino: vuelo?.destino,
      fecha: vuelo?.fecha_hora_salida
    });

    return this.obtener();
  }
}

module.exports = NCEBuilder;