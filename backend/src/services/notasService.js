const { serializarEmision, siguienteControl } = require('./dte/serializarEmision');
const { validarDTECompleto } = require('./dte/validators');
const pool = require('../config/db');
const crypto = require('crypto');
const { fechaElSalvador, horaElSalvador } = require('../utils/fechaElSalvador');
const { validarOrigenFacturaElSalvador } = require('./validarOrigenFacturaService');

const redondeo = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

function numeroALetras(num) {
  const UN = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const DEC = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const cent = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    if (n < 30) return UN[n];
    const c = Math.floor(n / 100), d = n % 100;
    if (d === 0) return CEN[c];
    let s = CEN[c] ? CEN[c] + ' ' : '';
    if (d < 30) s += UN[d];
    else { const dd = Math.floor(d / 10), u = d % 10; s += DEC[dd] + (u ? ' Y ' + UN[u] : ''); }
    return s.trim();
  };
  const miles = (n) => {
    if (n === 0) return '';
    if (n < 1000) return cent(n);
    const k = Math.floor(n / 1000), r = n % 1000;
    const kk = k === 1 ? 'MIL' : cent(k) + ' MIL';
    return (kk + (r ? ' ' + cent(r) : '')).trim();
  };
  const millon = (n) => {
    if (n < 1000000) return miles(n);
    const m = Math.floor(n / 1000000), r = n % 1000000;
    const mm = m === 1 ? 'UN MILLÓN' : miles(m) + ' MILLONES';
    return (mm + (r ? ' ' + miles(r) : '')).trim();
  };
  const enteros = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - enteros) * 100);
  return (enteros === 0 ? 'CERO' : millon(enteros)) + ' DÓLARES CON ' + String(centavos).padStart(2, '0') + '/100';
}

async function generarNotaInterna(datos, conn) {
  const { origenUuid, tipoDte, motivo, monto, noGravado, montoIncluyeIva } = datos;
  if (!['05', '06'].includes(tipoDte)) throw new Error('Tipo de nota inválido (05 NCE / 06 NDE)');
  const [orig] = await conn.query("SELECT * FROM dte_headers WHERE uuid_generation = ? AND dte_type IN ('01','03')", [origenUuid]);
  if (!orig.length) throw new Error('DTE origen no encontrado o no válido (solo FE o CCFE de El Salvador)');
  const row = orig[0];
  await validarOrigenFacturaElSalvador(row, conn);
  if (!row.reception_seal) throw new Error('El DTE origen debe tener Sello de Recepción');
  const origJson = typeof row.full_json === 'string' ? JSON.parse(row.full_json) : row.full_json;
  const m = Number(monto);
  if (!m || m <= 0) throw new Error('El monto del ajuste debe ser mayor a 0');
  const ng = redondeo(Number(noGravado || 0));
  const tipoOrigen = String(origJson.identificacion.tipoDte);
  const esFE = tipoOrigen === '01';
  const esCCFE = tipoOrigen === '03';
  const esFEXE = tipoOrigen === '11';

  // El IVA no se fija aquí: se replica la proporción que tenía el DTE de origen,
  // cuyos tributos provienen de las reglas de "Fiscalidad y tasas".
  const resOrig = origJson.resumen || {};
  const tributoIvaOrig = (Array.isArray(resOrig.tributos) ? resOrig.tributos : []).find((t) => String(t.codigo) === '20');
  const ivaOrig = Number(esCCFE ? (tributoIvaOrig ? tributoIvaOrig.valor : 0) : (resOrig.totalIva || 0)) || 0;
  const proporcionIva = Number(resOrig.totalGravada) > 0 ? ivaOrig / Number(resOrig.totalGravada) : 0;
  const montoConIva = esCCFE && montoIncluyeIva === true;
  const ventaGravada = redondeo(montoConIva && proporcionIva > 0 ? m / (1 + proporcionIva) : m);
  const totalivaItem = esFEXE ? 0 : redondeo(montoConIva ? m - ventaGravada : ventaGravada * proporcionIva);
  const llevaIva = esCCFE && totalivaItem > 0;
  const tributosItem = llevaIva ? ['20'] : null;
  const codTributoItem = llevaIva ? '20' : null;
  const tributosResumen = llevaIva ? [{ codigo: '20', descripcion: tributoIvaOrig.descripcion || 'Impuesto al Valor Agregado', valor: totalivaItem }] : null;
  const subTotalVentas = ventaGravada;
  const montoTotalOperacion = esCCFE ? redondeo(subTotalVentas + totalivaItem) : subTotalVentas;
  const totalPagar = redondeo(montoTotalOperacion + ng);

  const cuerpo = [{
    numItem: 1, tipoItem: 2, numeroDocumento: origJson.identificacion.codigoGeneracion,
    cantidad: 1, codigo: null, codTributo: codTributoItem, uniMedida: 59,
    descripcion: motivo || (tipoDte === '05' ? 'Ajuste por devolución/crédito' : 'Ajuste por cargo/débito'),
    precioUni: ventaGravada, montoDescu: 0, ventaNoSuj: 0, ventaExenta: 0, ventaGravada: ventaGravada,
    tributos: tributosItem, psv: 0, noGravado: 0, ivaPerci: 0, totaliva: totalivaItem, ivaRete: 0
  }];
  if (ng !== 0) {
    cuerpo.push({
      numItem: 2, tipoItem: 2, numeroDocumento: origJson.identificacion.codigoGeneracion,
      cantidad: 1, codigo: null, codTributo: null, uniMedida: 99,
      descripcion: ng > 0 ? 'Cargo que no afecta la base imponible' : 'Abono que no afecta la base imponible',
      precioUni: 0, montoDescu: 0, ventaNoSuj: 0, ventaExenta: 0, ventaGravada: 0,
      tributos: null, psv: 0, noGravado: ng, ivaPerci: 0, totaliva: 0, ivaRete: 0
    });
  }

  const ahora = new Date();
  const fec = fechaElSalvador(ahora);
  const hor = horaElSalvador(ahora);
  const numeroControl = (await siguienteControl(tipoDte, conn)).numero;
  const uuid = crypto.randomUUID().toUpperCase();
  const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();

  const dte = {
    simulacion: require('../config/simulation').SIMULATION,
    identificacion: {
      version: 4, ambiente: require('../config/simulation').SIMULATION.ambiente, tipoDte: tipoDte,
      numeroControl: numeroControl, codigoGeneracion: uuid, tipoModelo: 1, tipoOperacion: 1,
      tipoContingencia: null, motivoContin: null, fecEmi: fec, horEmi: hor, tipoMoneda: 'USD', fusion: null
    },
    documentoRelacionado: [{
      tipoDocumento: origJson.identificacion.tipoDte, tipoGeneracion: 2,
      numeroDocumento: origJson.identificacion.codigoGeneracion,
      fechaEmision: origJson.identificacion.fecEmi
    }],
    emisor: origJson.emisor,
    receptor: origJson.receptor,
    ventaTercero: origJson.ventaTercero || null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalNoSuj: 0,
      totalExenta: 0,
      totalGravada: ventaGravada,
      subTotalVentas: subTotalVentas,
      descuNoSuj: 0,
      descuExenta: 0,
      descuGravada: 0,
      porcentajeDescuento: 0,
      totalDescu: 0,
      tributos: tributosResumen,
      ivaPerci: 0,
      ivaRete: 0,
      reteRenta: 0,
      montoTotalOperacion: montoTotalOperacion,
      totalPagar, condicionOperacion: 3,
      totalLetras: numeroALetras(montoTotalOperacion)
    },
    extension: {
      nombEntrega: null,
      docuEntrega: null,
      nombRecibe: null,
      docuRecibe: null,
      observaciones: null
    },
    apendice: [{ campo: 'motivo', etiqueta: 'Motivo del ajuste', valor: motivo || null }]
  };

  const validation = validarDTECompleto(dte, tipoDte);
  if (!validation.valido) throw new Error(validation.errores.join('; '));
  const r_corr = parseInt(numeroControl.split('-').pop(), 10) || 1;
  await conn.query(
    `INSERT INTO dte_headers (uuid_generation, dte_type, control_number, annual_correlative, emission_date, emission_time,
        environment, billing_model, operation_type, transmission_status, reception_seal, reservation_id, full_json,
        issuer_nit, issuer_name, receiver_name, receiver_doc_type, receiver_doc_number,
        total_non_taxable, total_exempt, total_taxable, total_vat, total_to_pay)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid, tipoDte, numeroControl, r_corr, fec, hor,
     require('../config/simulation').SIMULATION.ambiente, 1, 1, 'accepted', sello, row.reservation_id, JSON.stringify(dte),
     dte.emisor.nit, dte.emisor.nombre, dte.receptor.nombre, dte.receptor.tipoDocumento || null, dte.receptor.numDocumento || null,
     0, 0, ventaGravada, totalivaItem, totalPagar]
  );
  return { numeroControl: numeroControl, uuid: uuid, sello: sello, totalPagar: totalPagar, tipoDte: tipoDte };
}

async function listarNotas() {
  const [rows] = await pool.query(
    `SELECT h.id, h.dte_type, h.control_number, h.uuid_generation, h.reception_seal, h.emission_date, h.emission_time, h.total_to_pay, h.reservation_id, h.full_json
     FROM dte_headers h WHERE h.dte_type IN ('05','06') AND h.reservation_id IS NOT NULL
       AND (SELECT COALESCE(NULLIF(BINARY c.code, BINARY ''), NULLIF(BINARY ao.country_code, BINARY ''))
            FROM flight_segments fs JOIN flights f ON f.id = fs.flight_id
            JOIN routes rt ON rt.id = f.route_id JOIN airports ao ON ao.id = rt.origin_id
            LEFT JOIN countries c ON c.id = ao.country_id
            WHERE fs.reservation_id = h.reservation_id ORDER BY f.departure_datetime, fs.id LIMIT 1) = BINARY 'SV'
     ORDER BY h.id DESC`
  );
  return rows;
}

async function origenes() {
  const [rows] = await pool.query(
    `SELECT h.uuid_generation, h.dte_type, h.control_number, h.emission_date, h.emission_time, h.total_to_pay, h.reception_seal, h.full_json
     FROM dte_headers h WHERE h.dte_type IN ('01','03') AND h.reception_seal IS NOT NULL AND h.reservation_id IS NOT NULL
       AND (SELECT COALESCE(NULLIF(BINARY c.code, BINARY ''), NULLIF(BINARY ao.country_code, BINARY ''))
            FROM flight_segments fs JOIN flights f ON f.id = fs.flight_id
            JOIN routes rt ON rt.id = f.route_id JOIN airports ao ON ao.id = rt.origin_id
            LEFT JOIN countries c ON c.id = ao.country_id
            WHERE fs.reservation_id = h.reservation_id ORDER BY f.departure_datetime, fs.id LIMIT 1) = BINARY 'SV'
     ORDER BY h.id DESC`
  );
  return rows;
}

const generarNota = datos => serializarEmision(conn => generarNotaInterna(datos, conn));
module.exports = { generarNota: generarNota, listarNotas: listarNotas, origenes: origenes };
