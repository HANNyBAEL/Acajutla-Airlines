// Validadores del contrato interno de la simulación escolar; sin certificación fiscal.
const { esUUIDValido, validarNumeroControl } = require('./utils');
const catalogs = require('./catalogs');

/**
 * Valida la sección de identificación
 */
const validarIdentificacion = (identificacion, tipoDte) => {
  const errores = [];

  // Versión correcta según tipo
  const versionEsperada = catalogs.VERSIONES_DTE[tipoDte];
  if (identificacion.version !== versionEsperada) {
    errores.push(`Versión inválida. Esperada: ${versionEsperada}, recibida: ${identificacion.version}`);
  }

  // Ambiente válido
  if (!catalogs.CAT001[identificacion.ambiente]) {
    errores.push('Ambiente inválido');
  }

  // Tipo DTE coincide
  if (identificacion.tipoDte !== tipoDte) {
    errores.push('tipoDte no coincide');
  }

  // UUID v4 válido
  if (!esUUIDValido(identificacion.codigoGeneracion)) {
    errores.push('codigoGeneracion no es UUID v4 válido');
  }

  // Número de control (31 chars)
  if (!validarNumeroControl(identificacion.numeroControl)) {
    errores.push('numeroControl con estructura inválida');
  }

  // Modelo facturación
  if (!['1', '2'].includes(String(identificacion.tipoModelo))) {
    errores.push('tipoModelo inválido');
  }

  // Tipo operación
  if (!['1', '2'].includes(String(identificacion.tipoOperacion))) {
    errores.push('tipoOperacion inválido');
  }

  // Si es contingencia, validar campos
  if (String(identificacion.tipoOperacion) === '2') {
    if (!catalogs.DTE_CONTINGENCIA.includes(tipoDte)) {
      errores.push(`Tipo DTE ${tipoDte} no permite contingencia`);
    }
    if (!catalogs.CAT005[String(identificacion.tipoContingencia)]) {
      errores.push('tipoContingencia inválido o requerido en contingencia');
    }
    if (String(identificacion.tipoContingencia) === '5' && (typeof identificacion.motivoContin !== 'string' || !identificacion.motivoContin.trim())) {
      errores.push('motivoContin requerido cuando tipoContingencia=5');
    }
    if (typeof identificacion.motivoContin === 'string' && identificacion.motivoContin.length > 500) {
      errores.push('motivoContin no puede exceder 500 caracteres');
    }
  } else {
    // Modo normal: estos campos deben ser null
    if (identificacion.tipoContingencia !== null) {
      errores.push('tipoContingencia debe ser null en modo normal');
    }
  }

  // Formato fecha YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(identificacion.fecEmi)) {
    errores.push('fecEmi con formato inválido');
  }

  // Formato hora HH:MM:SS
  if (!/^\d{2}:\d{2}:\d{2}$/.test(identificacion.horEmi)) {
    errores.push('horEmi con formato inválido');
  }

  // Moneda USD
  if (identificacion.tipoMoneda !== 'USD') {
    errores.push('tipoMoneda debe ser USD');
  }

  return errores;
};

/**
 * Valida emisor
 */
const validarEmisor = (emisor, tipoDte) => {
  const errores = [];

  if (!emisor.nit || !/^\d{9,14}$/.test(emisor.nit)) {
    errores.push('NIT emisor inválido');
  }

  if (!emisor.nombre || emisor.nombre.length > 250) {
    errores.push('Nombre emisor inválido');
  }

  if (!emisor.codActividad || !/^\d{5,6}$/.test(emisor.codActividad)) {
    errores.push('codActividad emisor inválido');
  }

  // NRC requerido para CCFE
  if (tipoDte === '03' && !emisor.nrc) {
    errores.push('NRC emisor requerido para CCFE');
  }

  // Dirección
  if (!emisor.direccion?.departamento || !emisor.direccion?.municipio) {
    errores.push('Dirección emisor incompleta');
  }

  if (!emisor.telefono || emisor.telefono.length < 8) {
    errores.push('Teléfono emisor inválido');
  }

  if (!emisor.correo || !emisor.correo.includes('@')) {
    errores.push('Correo emisor inválido');
  }

  return errores;
};

/**
 * Valida receptor según tipo de DTE
 */
const validarReceptor = (receptor, tipoDte, totalOperacion, opciones = {}) => {
  const errores = [];
  // Art. 114 b) 7) y 119-G b) VII del Código Tributario: para FE de
  // personas naturales la identificación fiscal se exige cuando la operación
  // supera $25,000 o cuando el comprador necesita documentar un costo/gasto
  // deducible. Un extranjero que solicita la factura para documentar la
  // operación también debe identificarse.
  const UMBRAL_FE = 25000;

  // CCFE siempre requiere NIT + NRC
  if (tipoDte === '03') {
    if (!receptor.nit || !/^\d{9,14}$/.test(receptor.nit)) {
      errores.push('NIT receptor requerido para CCFE');
    }
    if (!receptor.nrc) {
      errores.push('NRC receptor requerido para CCFE');
    }
  }

  // FE: la necesidad de documentación fiscal puede surgir también bajo el
  // umbral. Esta señal es contexto de la aplicación y no se agrega al JSON DTE.
  const requiereIdentificacionFE = Number(totalOperacion) > UMBRAL_FE
    || opciones.requiereDeduccionFiscal === true
    || opciones.receptorExtranjero === true;
  if (tipoDte === '01') {
    const tieneTipo = Boolean(receptor.tipoDocumento);
    const tieneNumero = Boolean(typeof receptor.numDocumento === 'string' && receptor.numDocumento.trim());
    if (requiereIdentificacionFE && (!tieneTipo || !tieneNumero)) {
      errores.push('La FE requiere identificación del receptor por monto superior a $25,000 o por solicitud de documentación fiscal/deducción');
    } else if (tieneTipo !== tieneNumero) {
      errores.push('tipoDocumento y numDocumento del receptor deben proporcionarse juntos');
    }
    if (tieneTipo && !catalogs.CAT022[String(receptor.tipoDocumento)]) {
      errores.push('tipoDocumento del receptor inválido para FE');
    }
  }

  // FEXE: país obligatorio y diferente a SV
  if (tipoDte === '11') {
    if (!receptor.codPais) {
      errores.push('codPais requerido para FEXE');
    }
    if (receptor.codPais === 'SV') {
      errores.push('codPais no puede ser SV para FEXE');
    }
    if (!receptor.nombrePais) {
      errores.push('nombrePais requerido para FEXE');
    }
  }

  if (!receptor.nombre || receptor.nombre.length > 250) {
    errores.push('Nombre receptor inválido');
  }

  return errores;
};

/**
 * Valida cuerpo del documento (items)
 */
const validarCuerpo = (cuerpo, tipoDte) => {
  const errores = [];

  if (!Array.isArray(cuerpo) || cuerpo.length === 0) {
    errores.push('cuerpoDocumento vacío');
    return errores;
  }

  if (cuerpo.length > 2000) {
    errores.push('Máximo 2000 ítems');
  }

  cuerpo.forEach((item, idx) => {
    const prefix = `Item ${idx + 1}:`;

    if (!item.numItem || item.numItem < 1) {
      errores.push(`${prefix} numItem inválido`);
    }

    if (!item.cantidad || item.cantidad <= 0) {
      errores.push(`${prefix} cantidad debe ser > 0`);
    }

    if (!Number.isFinite(item.precioUni) || item.precioUni < 0) {
      errores.push(`${prefix} precioUni inválido`);
    }

    if (!item.descripcion || item.descripcion.length > 1500) {
      errores.push(`${prefix} descripción inválida`);
    }

    // FE: precios incluyen IVA
    // CCFE/FEXE: precios sin IVA
    if (tipoDte === '14' ? !Number.isFinite(item.compra) : !Number.isFinite(item.ventaGravada)) {
      errores.push(`${prefix} ventaGravada requerida`);
    }
  });

  return errores;
};

/**
 * Valida resumen (totales)
 */
const validarResumen = (resumen, tipoDte) => {
  const errores = [];

  const camposRequeridos = tipoDte === '14' ? ['totalCompra', 'subTotal', 'totalPagar'] : tipoDte === '11' ? ['totalGravada', 'montoTotalOperacion', 'totalPagar'] : ['totalNoSuj', 'totalExenta', 'totalGravada', 'subTotalVentas', 'montoTotalOperacion', 'totalPagar'];

  camposRequeridos.forEach(campo => {
    if (!Number.isFinite(resumen[campo]) || resumen[campo] < 0) {
      errores.push(`resumen.${campo} inválido`);
    }
  });

  // Condición operación
  if (!catalogs.CAT016[String(resumen.condicionOperacion)]) {
    errores.push('condicionOperacion inválida');
  }

  // Si es contado (1), debe haber formas de pago
  if (String(resumen.condicionOperacion) === '1') {
    if (!resumen.pagos || resumen.pagos.length === 0) {
      errores.push('pagos requeridos cuando condición=contado');
    }
  }

  return errores;
};

/**
 * Validación completa de un DTE
 */
const validarDTECompleto = (dte, tipoDte, opciones = {}) => {
  const errores = [];

  errores.push(...validarIdentificacion(dte.identificacion, tipoDte));
  errores.push(...validarEmisor(dte.emisor, tipoDte));
  errores.push(...validarReceptor(dte.receptor, tipoDte, dte.resumen?.montoTotalOperacion, opciones));
  errores.push(...validarCuerpo(dte.cuerpoDocumento, tipoDte));
  errores.push(...validarResumen(dte.resumen, tipoDte));

  return {
    valido: errores.length === 0,
    errores
  };
};

module.exports = {
  validarIdentificacion,
  validarEmisor,
  validarReceptor,
  validarCuerpo,
  validarResumen,
  validarDTECompleto
};
