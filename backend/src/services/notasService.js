const pool = require('../config/db');
const crypto = require('crypto');

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

async function siguienteControl(tipo) {
  const [r] = await pool.query("SELECT COUNT(*) AS n FROM dte_headers WHERE dte_type = ?", [tipo]);
  return 'DTE-' + tipo + '-M001P001-' + String(r[0].n + 1).padStart(15, '0');
}

async function generarNota(datos) {
  const { origenUuid, tipoDte, motivo, monto, noGravado } = datos;
  if (!['05', '06'].includes(tipoDte)) throw new Error('Tipo de nota inválido (05 NCE / 06 NDE)');
  const [orig] = await pool.query("SELECT * FROM dte_headers WHERE uuid_generation = ? AND dte_type IN ('01','03')", [origenUuid]);
  if (!orig.length) throw new Error('DTE origen no encontrado');
  const row = orig[0];
  if (!row.reception_seal) throw new Error('El DTE origen debe tener Sello de Recepción');
  const origJson = typeof row.full_json === 'string' ? JSON.parse(row.full_json) : row.full_json;
  const m = Number(monto);
  if (!m || m <= 0) throw new Error('El monto del ajuste debe ser mayor a 0');
  const ng = redondeo(Number(noGravado || 0));
  const esFEorig = String(origJson.identificacion.tipoDte) === '01';

  const ventaGravada = redondeo(m);
  const totalivaItem = esFEorig ? redondeo((ventaGravada / 1.13) * 0.13) : redondeo(ventaGravada * 0.13);
  const tributosItem = esFEorig ? null : ['20'];
  const codTributoItem = esFEorig ? null : '20';
  const tributosResumen = esFEorig ? null : [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: totalivaItem }];
  const subTotalVentas = ventaGravada;
  const montoTotalOperacion = esFEorig ? subTotalVentas : redondeo(subTotalVentas + totalivaItem);
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
  const fec = ahora.toISOString().slice(0, 10);
  const hor = ahora.toTimeString().slice(0, 8);
  const numeroControl = await siguienteControl(tipoDte);
  const uuid = crypto.randomUUID().toUpperCase();
  const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();

  const dte = {
    identificacion: {
      version: 4, ambiente: process.env.DTE_AMBIENTE || '00', tipoDte: tipoDte,
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
    otrosDocumentos: null,
    ventaTercero: origJson.ventaTercero || null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalNoSuj: 0, totalExenta: 0, totalGravada: ventaGravada, subTotalVentas: subTotalVentas,
      totalDescu: 0, tributos: tributosResumen,
      ivaPerci: 0, codigoRetencionMH: null, ivaRete: 0, totalIva: totalivaItem,
      montoTotalOperacion: montoTotalOperacion, totalNoGravado: ng, totalPagar: totalPagar,
      totalLetras: numeroALetras(totalPagar),
      condicionOperacion: 1,
      pagos: [{ codigo: '01', montoPago: totalPagar, referencia: null, plazo: null, periodo: null }],
      numPagoElectronico: null
    },
    apendice: [{ campo: 'motivo', etiqueta: 'Motivo del ajuste', valor: motivo || null }]
  };

  await pool.query(
    `INSERT INTO dte_headers (dte_type, control_number, uuid_generation, reception_seal, full_json, emission_date, total_to_pay, reservation_id, transmission_status)
     VALUES (?,?,?,?,?,?,?,?, 'accepted')`,
    [tipoDte, numeroControl, uuid, sello, JSON.stringify(dte), fec, totalPagar, row.reservation_id]
  );
  return { numeroControl: numeroControl, uuid: uuid, sello: sello, totalPagar: totalPagar, tipoDte: tipoDte };
}

async function listarNotas() {
  const [rows] = await pool.query(
    "SELECT id, dte_type, control_number, uuid_generation, reception_seal, emission_date, total_to_pay, reservation_id, full_json FROM dte_headers WHERE dte_type IN ('05','06') ORDER BY id DESC"
  );
  return rows;
}

async function origenes() {
  const [rows] = await pool.query(
    "SELECT uuid_generation, dte_type, control_number, emission_date, total_to_pay, reception_seal, full_json FROM dte_headers WHERE dte_type IN ('01','03') AND reception_seal IS NOT NULL ORDER BY id DESC"
  );
  return rows;
}

module.exports = { generarNota: generarNota, listarNotas: listarNotas, origenes: origenes };