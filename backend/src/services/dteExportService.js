const pool = require('../config/db');
const crypto = require('crypto');

const redondeo = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const redondeo8 = (v) => Math.round((Number(v) + Number.EPSILON) * 1e8) / 1e8;

const EMISOR_BASE = {
  nit: process.env.DTE_NIT || '06141234561010',
  nrc: process.env.DTE_NRC || '1234567',
  nombre: 'ACAJUTLA AIRLINES S.A. DE C.V.',
  codActividad: '51100',
  descActividad: 'Transporte aéreo de pasajeros',
  nombreComercial: 'ACAJUTLA AIRLINES',
  direccion: { departamento: '03', municipio: '18', distrito: '01', complemento: 'Puerto de Acajutla, Sonsonate, Distrito Acajutla' },
  telefono: '24580000',
  correo: 'facturacion@acajutlaairlines.com',
  codEstable: 'M001',
  codPuntoVenta: 'P001'
};

function fechaHora() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return { fec: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), hor: p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) };
}

function numeroALetras(num) {
  const UN = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
  const DEC = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const cent = (n) => { if (n === 0) return ''; if (n === 100) return 'CIEN'; if (n < 30) return UN[n]; const c = Math.floor(n / 100), d = n % 100; if (d === 0) return CEN[c]; let s = CEN[c] ? CEN[c] + ' ' : ''; if (d < 30) s += UN[d]; else { const dd = Math.floor(d / 10), u = d % 10; s += DEC[dd] + (u ? ' Y ' + UN[u] : ''); } return s.trim(); };
  const miles = (n) => { if (n === 0) return ''; if (n < 1000) return cent(n); const k = Math.floor(n / 1000), r = n % 1000; return (k === 1 ? 'MIL' : cent(k) + ' MIL') + (r ? ' ' + cent(r) : ''); };
  const millon = (n) => { if (n < 1000000) return miles(n); const m = Math.floor(n / 1000000), r = n % 1000000; return (m === 1 ? 'UN MILLÓN' : miles(m) + ' MILLONES') + (r ? ' ' + miles(r) : ''); };
  const e = Math.floor(Math.abs(num));
  const c = Math.round((Math.abs(num) - e) * 100);
  return (e === 0 ? 'CERO' : millon(e)) + ' DÓLARES CON ' + String(c).padStart(2, '0') + '/100';
}

async function siguienteControl(tipo) {
  const anio = new Date().getFullYear();
  const [r] = await pool.query('SELECT COUNT(*) AS n FROM dte_headers WHERE dte_type = ? AND YEAR(emission_date) = ?', [tipo, anio]);
  return 'DTE-' + tipo + '-M001P001-' + String(r[0].n + 1).padStart(15, '0');
}

async function datosReserva(reservationId) {
  const [r] = await pool.query('SELECT r.*, c.first_names, c.last_names, c.email, c.document_type, c.document_number FROM reservations r LEFT JOIN customers c ON c.id = r.customer_id WHERE r.id = ?', [reservationId]);
  if (!r.length) throw new Error('Reserva no encontrada');
  if (r[0].status !== 'paid') throw new Error('La reserva debe estar PAGADA para facturar');
  const [vuelos] = await pool.query('SELECT f.flight_number, ao.iata_code AS origen, ad.iata_code AS destino FROM flight_segments fs JOIN flights f ON f.id = fs.flight_id JOIN routes rt ON rt.id = f.route_id JOIN airports ao ON ao.id = rt.origin_id JOIN airports ad ON ad.id = rt.destination_id WHERE fs.reservation_id = ?', [reservationId]);
  return { reserva: r[0], vuelos: vuelos };
}

async function guardar(tipo, json, reservationId, totalPagar) {
  const fh = fechaHora();
  const uuid = crypto.randomUUID().toUpperCase();
  const numeroControl = await siguienteControl(tipo);
  const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
  const [h] = await pool.query(
    'INSERT INTO dte_headers (dte_type, control_number, uuid_generation, reception_seal, full_json, emission_date, total_to_pay, reservation_id, transmission_status) VALUES (?,?,?,?,?,?,?,?,?)',
    [tipo, numeroControl, uuid, sello, JSON.stringify(json), fh.fec, totalPagar, reservationId, 'accepted']
  );
  return { id: h.insertId, uuid: uuid, numeroControl: numeroControl, sello: sello };
}

async function emitirFEXE(datos) {
  const { reserva, vuelos } = await datosReserva(datos.reservation_id);
  const codPais = String(datos.codPais || '').toUpperCase();
  if (!codPais || codPais === 'SV') throw new Error('RN-FIS-05: el código de país del receptor es obligatorio y debe ser diferente a SV');
  const tipoItemExpor = Number(datos.tipoItemExpor || 1);
  const monto = redondeo(Number(datos.monto || reserva.estimated_total));
  const seguro = redondeo(Number(datos.seguro || 0));
  const flete = redondeo(Number(datos.flete || 0));
  const fh = fechaHora();

  const emisor = Object.assign({}, EMISOR_BASE, {
    tipoItemExpor: tipoItemExpor,
    recintoFiscal: tipoItemExpor === 1 ? (datos.recintoFiscal || null) : null,
    tipoRegimen: tipoItemExpor === 1 ? (datos.tipoRegimen || null) : null,
    regimen: tipoItemExpor === 1 ? (datos.regimen || null) : null
  });

  const receptor = {
    tipoDocumento: datos.tipoDocumento || '3',
    numDocumento: datos.numDocumento || reserva.document_number || null,
    nombre: datos.nombre || ((reserva.first_names || '') + ' ' + (reserva.last_names || '')).trim() || 'CLIENTE EXTRANJERO',
    codActividad: null,
    descActividad: null,
    nombreComercial: null,
    direccion: null,
    telefono: datos.telefono || null,
    correo: datos.correo || reserva.email || null,
    codPais: codPais,
    nombrePais: datos.nombrePais || null,
    tipoPersona: Number(datos.tipoPersona || 1)
  };

  const cuerpo = [{
    numItem: 1,
    tipoItem: tipoItemExpor,
    numeroDocumento: null,
    codigo: null,
    codTributo: null,
    uniMedida: 59,
    descripcion: datos.descripcion || ('Boleto aéreo internacional ' + vuelos.map((v) => v.flight_number).join(', ')),
    precioUni: redondeo8(monto),
    montoDescu: 0,
    ventaGravada: redondeo8(monto),
    tributos: ['C3'],
    noGravado: 0
  }];

  const montoTotalOperacion = redondeo(monto + seguro + flete);
  const totalPagar = redondeo(montoTotalOperacion);

  const json = {
    identificacion: { version: 3, ambiente: process.env.DTE_AMBIENTE || '00', tipoDte: '11', numeroControl: await siguienteControl('11'), codigoGeneracion: crypto.randomUUID().toUpperCase(), tipoModelo: 1, tipoOperacion: 1, tipoContingencia: null, motivoContin: null, fecEmi: fh.fec, horEmi: fh.hor, tipoMoneda: 'USD' },
    documentoRelacionado: null,
    emisor: emisor,
    receptor: receptor,
    otrosDocumentos: null,
    ventaTercero: null,
    compraTercero: null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalGravada: redondeo(monto),
      descuGravada: 0,
      porcentajeDescuento: 0,
      totalDescu: 0,
      tributos: [{ codigo: 'C3', descripcion: 'Impuesto al Valor Agregado (exportaciones) 0%', valor: 0 }],
      seguro: seguro,
      flete: flete,
      montoTotalOperacion: montoTotalOperacion,
      totalNoGravado: 0,
      totalNoOnerosas: 0,
      totalPagar: totalPagar,
      totalLetras: numeroALetras(totalPagar),
      condicionOperacion: 1,
      pagos: [{ codigo: '01', montoPago: totalPagar, referencia: null, plazo: null, periodo: null }],
      numPagoElectronico: null,
      codIncoterms: tipoItemExpor === 1 ? (datos.codIncoterms || null) : null,
      descIncoterms: tipoItemExpor === 1 ? (datos.descIncoterms || null) : null,
      observaciones: null
    },
    apendice: [{ campo: 'PNR', etiqueta: 'Código de reserva', valor: reserva.pnr }]
  };
  return guardar('11', json, datos.reservation_id, totalPagar);
}

async function emitirFSEE(datos) {
  const { reserva } = await datosReserva(datos.reservation_id);
  const monto = redondeo(Number(datos.monto || reserva.estimated_total));
  const reteRenta = redondeo(Number(datos.reteRenta || 0));
  const fh = fechaHora();

  const receptor = {
    tipoDocumento: datos.tipoDocumento || '36',
    numDocumento: datos.numDocumento || reserva.document_number || null,
    nombre: datos.nombre || ((reserva.first_names || '') + ' ' + (reserva.last_names || '')).trim() || 'SUJETO EXCLUIDO',
    codActividad: null,
    descActividad: null,
    direccion: null,
    telefono: datos.telefono || null,
    correo: datos.correo || reserva.email || null
  };

  const cuerpo = [{
    numItem: 1,
    tipoItem: 2,
    numeroDocumento: null,
    codigo: null,
    uniMedida: 59,
    descripcion: datos.descripcion || ('Venta a sujeto excluido - reserva ' + reserva.pnr),
    precioUni: redondeo8(monto),
    montoDescu: 0,
    compra: redondeo8(monto)
  }];

  const subTotal = redondeo(monto);
  const totalPagar = redondeo(Math.max(0, subTotal - reteRenta));

  const json = {
    identificacion: { version: 2, ambiente: process.env.DTE_AMBIENTE || '00', tipoDte: '14', numeroControl: await siguienteControl('14'), codigoGeneracion: crypto.randomUUID().toUpperCase(), tipoModelo: 1, tipoOperacion: 1, tipoContingencia: null, motivoContin: null, fecEmi: fh.fec, horEmi: fh.hor, tipoMoneda: 'USD' },
    documentoRelacionado: null,
    emisor: Object.assign({}, EMISOR_BASE),
    receptor: receptor,
    otrosDocumentos: null,
    ventaTercero: null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalCompra: redondeo(monto),
      descu: 0,
      totalDescu: 0,
      subTotal: subTotal,
      reteRenta: reteRenta,
      totalPagar: totalPagar,
      totalLetras: numeroALetras(totalPagar),
      condicionOperacion: 1,
      pagos: [{ codigo: '01', montoPago: totalPagar, referencia: null, plazo: null, periodo: null }],
      observaciones: null
    },
    apendice: [{ campo: 'PNR', etiqueta: 'Código de reserva', valor: reserva.pnr }]
  };
  return guardar('14', json, datos.reservation_id, totalPagar);
}

async function listar(tipo) {
  const [rows] = await pool.query('SELECT id, dte_type, control_number, uuid_generation, reception_seal, emission_date, total_to_pay, reservation_id FROM dte_headers WHERE dte_type IN (?, ?) ORDER BY id DESC', ['11', '14']);
  return rows;
}

module.exports = { emitirFEXE: emitirFEXE, emitirFSEE: emitirFSEE, listar: listar };