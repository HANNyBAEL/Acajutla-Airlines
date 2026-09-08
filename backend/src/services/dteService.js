const pool = require('../config/db');
const crypto = require('crypto');

const CONFIG = {
  ambiente: process.env.DTE_AMBIENTE || '00',
  establecimiento: 'M001',
  puntoVenta: 'P001',
  nit: process.env.DTE_NIT || '06141234561010',
  nrc: process.env.DTE_NRC || '1234567',
  nombre: 'ACAJUTLA AIRLINES S.A. DE C.V.',
  codActividad: '51100',
  descActividad: 'Transporte aéreo de pasajeros',
  nombreComercial: 'ACAJUTLA AIRLINES',
  direccion: { departamento: '03', municipio: '18', distrito: '01', complemento: 'Puerto de Acajutla, Sonsonate, Distrito Acajutla' },
  telefono: '24580000',
  correo: 'facturacion@acajutlaairlines.com'
};

const CAT017 = { cash: '01', card: '03', transfer: '05', paypal: '08' };
const CAT022 = { DUI: '13', NIT: '36', Passport: '3', '13': '13', '36': '36', '3': '3' };

const redondeo = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const pad = (n) => (n < 10 ? '0' + n : '' + n);
const fmtFecha = (d) => { const x = new Date(d); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
const fmtHora = (d) => { const x = new Date(d); return pad(x.getHours()) + ':' + pad(x.getMinutes()) + ':' + pad(x.getSeconds()); };
const uuidV4 = () => crypto.randomUUID().toUpperCase();

const siguienteCorrelativo = async (tipo) => {
  const anio = new Date().getFullYear();
  const [r] = await pool.query('SELECT COALESCE(MAX(annual_correlative), 0) + 1 AS n FROM dte_headers WHERE dte_type = ? AND YEAR(emission_date) = ?', [tipo, anio]);
  const seq = r[0].n;
  return { numero: 'DTE' + tipo + CONFIG.establecimiento + CONFIG.puntoVenta + String(seq).padStart(15, '0'), seq: seq };
};

const emitirDTE = async (opciones) => {
  const { reservation_id, tipo_dte, receptor: override, contingencia } = opciones;
  const cont = contingencia || null;
  if (!['01', '03'].includes(tipo_dte)) throw new Error('Tipo de DTE no soportado (use 01 FE o 03 CCFE)');

  const [res] = await pool.query(
    `SELECT r.*, c.first_names AS c_first, c.last_names AS c_last, c.email AS c_email,
            c.phone AS c_phone, c.document_type AS c_doctype, c.document_number AS c_docnum
     FROM reservations r LEFT JOIN customers c ON c.id = r.customer_id WHERE r.id = ?`,
    [reservation_id]
  );
  if (res.length === 0) throw new Error('Reserva no encontrada');
  const reserva = res[0];
  if (reserva.status !== 'paid') throw new Error('La reserva debe estar en estado PAGADA para emitir DTE');

  const [pax] = await pool.query('SELECT * FROM passengers WHERE reservation_id = ? ORDER BY id', [reservation_id]);
  if (pax.length === 0) throw new Error('La reserva no tiene pasajeros');
  const [vuelos] = await pool.query(
    `SELECT DISTINCT f.flight_number, f.departure_datetime FROM flight_segments fs
     JOIN flights f ON f.id = fs.flight_id WHERE fs.reservation_id = ? ORDER BY f.departure_datetime`,
    [reservation_id]
  );
  const vuelosTxt = vuelos.map((v) => v.flight_number).join(', ');
  const [pagos] = await pool.query(
    "SELECT * FROM payments WHERE reservation_id = ? AND status = 'approved' AND type = 'payment' ORDER BY id DESC LIMIT 1",
    [reservation_id]
  );
  const pago = pagos[0] || null;
  const precioPorPax = redondeo(parseFloat(reserva.estimated_total) / pax.length);

  const receptor = {
    tipoDocumento: CAT022[reserva.c_doctype] || '13',
    numDocumento: reserva.c_docnum || null,
    nit: null, nrc: null,
    nombre: ((reserva.c_first || '') + ' ' + (reserva.c_last || '')).trim() || 'CLIENTE FINAL',
    codActividad: null, descActividad: null, nombreComercial: null,
    direccion: null, telefono: reserva.c_phone || null, correo: reserva.c_email || null
  };
  if (override) Object.assign(receptor, override);
  if (tipo_dte === '03' && !receptor.nit) throw new Error('CCFE requiere NIT del receptor (RN-FIS-02)');

  const corr = await siguienteCorrelativo(tipo_dte);
  const identificacion = {
    version: tipo_dte === '01' ? 2 : 4,
    ambiente: CONFIG.ambiente,
    tipoDte: tipo_dte,
    codigoGeneracion: uuidV4(),
    numeroControl: corr.numero,
    tipoModelo: cont ? 2 : 1,
    tipoOperacion: cont ? 2 : 1,
    tipoContingencia: cont ? Number(cont.tipoContingencia) : null,
    motivoContin: cont && Number(cont.tipoContingencia) === 5 ? (cont.motivoContin || null) : null,
    fecEmi: fmtFecha(new Date()),
    horEmi: fmtHora(new Date()),
    tipoMoneda: 'USD'
  };

  let cuerpo, resumen;
  if (tipo_dte === '01') {
    cuerpo = pax.map((p, i) => {
      const ventaGravada = precioPorPax;
      return {
        numItem: i + 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: null, uniMedida: 99,
        descripcion: 'Boleto aéreo - ' + p.first_names + ' ' + p.last_names + ' (Vuelos: ' + vuelosTxt + ')',
        precioUni: ventaGravada, montoDescu: 0, ventaNoSuj: 0, ventaExenta: 0, ventaGravada: ventaGravada,
        tributos: null, ivaItem: redondeo((ventaGravada / 1.13) * 0.13), psv: 0, noGravado: 0
      };
    });
    const totalGravada = redondeo(cuerpo.reduce((s, it) => s + it.ventaGravada, 0));
    const totalIva = redondeo(cuerpo.reduce((s, it) => s + it.ivaItem, 0));
    resumen = {
      totalNoSuj: 0, totalExenta: 0, totalGravada: totalGravada, subTotalVentas: totalGravada,
      descuNoSuj: 0, descuExenta: 0, descuGravada: 0, porcentajeDescuento: 0, totalDescu: 0,
      tributos: null, subTotal: totalGravada, ivaRete: 0, totalIva: totalIva,
      montoTotalOperacion: totalGravada, totalNoGravado: 0, totalPagar: totalGravada, totalLetras: null,
      condicionOperacion: 1,
      pagos: [{ codigo: CAT017[pago ? pago.method : 'cash'] || '01', montoPago: totalGravada, referencia: pago ? pago.external_reference : null, plazo: null, periodo: null }],
      numPagoElectronico: null, observaciones: null
    };
  } else {
    cuerpo = pax.map((p, i) => {
      const base = redondeo(precioPorPax / 1.13);
      return {
        numItem: i + 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: '20', uniMedida: 99,
        descripcion: 'Boleto aéreo - ' + p.first_names + ' ' + p.last_names + ' (Vuelos: ' + vuelosTxt + ')',
        precioUni: base, montoDescu: 0, ventaNoSuj: 0, ventaExenta: 0, ventaGravada: base,
        tributos: ['20'], psv: 0, noGravado: 0
      };
    });
    const totalGravada = redondeo(cuerpo.reduce((s, it) => s + it.ventaGravada, 0));
    const iva = redondeo(totalGravada * 0.13);
    const total = redondeo(totalGravada + iva);
    resumen = {
      totalNoSuj: 0, totalExenta: 0, totalGravada: totalGravada, subTotalVentas: totalGravada,
      descuNoSuj: 0, descuExenta: 0, descuGravada: 0, porcentajeDescuento: 0, totalDescu: 0,
      tributos: [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: iva }],
      subTotal: totalGravada, ivaPerci: 0, ivaRete: 0,
      montoTotalOperacion: total, totalNoGravado: 0, totalPagar: total, totalLetras: null,
      condicionOperacion: 1,
      pagos: [{ codigo: CAT017[pago ? pago.method : 'cash'] || '01', montoPago: total, referencia: pago ? pago.external_reference : null, plazo: null, periodo: null }],
      numPagoElectronico: null, observaciones: null
    };
  }

  const dte = {
    identificacion: identificacion,
    documentoRelacionado: null,
    emisor: {
      nit: CONFIG.nit, nrc: CONFIG.nrc, nombre: CONFIG.nombre,
      codActividad: CONFIG.codActividad, descActividad: CONFIG.descActividad,
      nombreComercial: CONFIG.nombreComercial, direccion: CONFIG.direccion,
      telefono: CONFIG.telefono, correo: CONFIG.correo,
      codEstable: CONFIG.establecimiento, codPuntoVenta: CONFIG.puntoVenta
    },
    receptor: {
      tipoDocumento: receptor.tipoDocumento, numDocumento: receptor.numDocumento,
      nit: receptor.nit, nrc: receptor.nrc, nombre: receptor.nombre,
      codActividad: receptor.codActividad, descActividad: receptor.descActividad,
      nombreComercial: receptor.nombreComercial || null, direccion: receptor.direccion || null,
      telefono: receptor.telefono, correo: receptor.correo
    },
    otrosDocumentos: null,
    ventaTercero: null,
    compraTercero: null,
    cuerpoDocumento: cuerpo,
    resumen: resumen,
    apendice: [
      { campo: 'PNR', etiqueta: 'Código de reserva', valor: reserva.pnr },
      { campo: 'VUELOS', etiqueta: 'Vuelos facturados', valor: vuelosTxt }
    ]
  };

  const ivaGuardado = tipo_dte === '01' ? resumen.totalIva : redondeo(resumen.totalGravada * 0.13);
  const estadoInicial = cont ? 'contingency' : 'transmitted';
  const [head] = await pool.query(
    `INSERT INTO dte_headers (uuid_generation, dte_type, control_number, annual_correlative, emission_date, emission_time,
      environment, billing_model, operation_type, transmission_status, reservation_id, full_json,
      issuer_nit, issuer_name, receiver_name, receiver_doc_type, receiver_doc_number,
      total_non_taxable, total_exempt, total_taxable, total_vat, total_to_pay, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, NOW())`,
    [identificacion.codigoGeneracion, tipo_dte, identificacion.numeroControl, corr.seq, identificacion.fecEmi, identificacion.horEmi,
     CONFIG.ambiente, identificacion.tipoModelo, identificacion.tipoOperacion, estadoInicial, reservation_id, JSON.stringify(dte),
     CONFIG.nit, CONFIG.nombre, dte.receptor.nombre, dte.receptor.tipoDocumento, dte.receptor.numDocumento,
     resumen.totalGravada, ivaGuardado, resumen.totalPagar]
  );
  for (const it of cuerpo) {
    await pool.query(
      `INSERT INTO dte_items (header_id, item_number, item_type, quantity, unit_measure, description, unit_price, discount_amount, sale_non_taxable, sale_exempt, sale_taxable, vat_item, tribute_code)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      [head.insertId, it.numItem, it.tipoItem, it.uniMedida, it.descripcion, it.precioUni, it.montoDescu, it.ventaGravada, it.ivaItem || 0, it.codTributo]
    );
  }

  if (cont) {
    return { dteId: head.insertId, uuid: identificacion.codigoGeneracion, numeroControl: identificacion.numeroControl, estado: 'contingency', sello: null, errores: null, dte: dte };
  }

  const ok = Math.random() > 0.05;
  let estado, sello = null, errores = null;
  if (ok) { estado = 'accepted'; sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase(); }
  else { estado = 'rejected'; errores = ['Rechazo simulado del MH (prueba): corrija y reemita']; }
  await pool.query('UPDATE dte_headers SET transmission_status = ?, reception_seal = ?, reception_date = NOW() WHERE id = ?', [estado, sello, head.insertId]);
  return { dteId: head.insertId, uuid: identificacion.codigoGeneracion, numeroControl: identificacion.numeroControl, estado: estado, sello: sello, errores: errores, dte: dte };
};

module.exports = { emitirDTE: emitirDTE, CONFIG: CONFIG, fmtFecha: fmtFecha, fmtHora: fmtHora, uuidV4: uuidV4 };