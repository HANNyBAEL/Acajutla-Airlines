const { generarUUIDv4, generarNumeroControl, formatearFecha, formatearHora } = require('../utils');
const catalogs = require('../catalogs');

class BaseDTEBuilder {
  constructor(tipoDte, config) {
    this.tipoDte = tipoDte;
    this.config = config;
    this.dte = {};
  }

  async construirIdentificacion(datos = {}) {
    const ahora = new Date();
    const numeroControl = await generarNumeroControl(this.tipoDte, this.config.establecimiento, this.config.puntoVenta);
    this.dte.identificacion = {
      version: catalogs.VERSIONES_DTE[this.tipoDte],
      ambiente: this.config.ambiente || '00',
      tipoDte: this.tipoDte,
      codigoGeneracion: generarUUIDv4(),
      numeroControl,
      tipoModelo: 1,
      tipoOperacion: datos.tipoOperacion || 1,
      tipoContingencia: datos.tipoContingencia || null,
      motivoContin: datos.motivoContin || null,
      fecEmi: formatearFecha(datos.fecEmi || ahora),
      horEmi: formatearHora(datos.horEmi || ahora),
      tipoMoneda: 'USD'
    };
    return this;
  }

  construirEmisor(emisorCustom = null) {
    const emisor = emisorCustom || this.config.emisor;
    this.dte.emisor = {
      nit: emisor.nit, nrc: emisor.nrc, nombre: emisor.nombre,
      codActividad: emisor.codActividad, descActividad: emisor.descActividad,
      nombreComercial: emisor.nombreComercial || null,
      direccion: { departamento: emisor.direccion.departamento, municipio: emisor.direccion.municipio, distrito: emisor.direccion.distrito, complemento: emisor.direccion.complemento },
      telefono: emisor.telefono, correo: emisor.correo,
      codEstable: this.config.establecimiento || null, codPuntoVenta: this.config.puntoVenta || null
    };
    return this;
  }

  construirReceptor(receptor) {
    this.dte.receptor = {
      tipoDocumento: receptor.tipoDocumento || null, numDocumento: receptor.numDocumento || null,
      nit: receptor.nit || null, nrc: receptor.nrc || null, nombre: receptor.nombre,
      codActividad: receptor.codActividad || null, descActividad: receptor.descActividad || null,
      nombreComercial: receptor.nombreComercial || null,
      direccion: receptor.direccion ? { departamento: receptor.direccion.departamento, municipio: receptor.direccion.municipio, distrito: receptor.direccion.distrito || null, complemento: receptor.direccion.complemento } : null,
      telefono: receptor.telefono || null, correo: receptor.correo || null
    };
    return this;
  }

  construirDocumentosRelacionados(docs = null) {
    if (!docs || docs.length === 0) { this.dte.documentoRelacionado = null; return this; }
    this.dte.documentoRelacionado = docs.map(doc => ({ tipoDocumento: doc.tipoDocumento, tipoGeneracion: doc.tipoGeneracion || 2, numeroDocumento: doc.numeroDocumento, fechaEmision: doc.fechaEmision }));
    return this;
  }

  construirTerceros() { this.dte.ventaTercero = null; this.dte.compraTercero = null; return this; }

  construirApendice(pnr, datosVuelo) {
    if (!pnr) { this.dte.apendice = null; return this; }
    this.dte.apendice = [
      { campo: 'PNR', etiqueta: 'Código de reserva', valor: pnr },
      { campo: 'VUELO', etiqueta: 'Número de vuelo', valor: datosVuelo?.flight_number || '' },
      { campo: 'RUTA', etiqueta: 'Ruta', valor: `${datosVuelo?.origin || ''}-${datosVuelo?.destination || ''}` },
      { campo: 'FECHA_VUELO', etiqueta: 'Fecha vuelo', valor: datosVuelo?.departure_datetime || '' }
    ];
    return this;
  }

  obtener() { return this.dte; }
}

module.exports = BaseDTEBuilder;