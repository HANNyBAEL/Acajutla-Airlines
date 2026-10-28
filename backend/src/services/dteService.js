const pool = require('../config/db');
const crypto = require('crypto');
const mhSimulator = require('./mhSimulatorService');
const { validarDTECompleto } = require('./dte/validators');
const { VERSIONES_DTE } = require('./dte/catalogs');
const { serializarEmision, siguienteControl } = require('./dte/serializarEmision');
const { SIMULATION } = require('../config/simulation');
const { fechaElSalvador, horaElSalvador } = require('../utils/fechaElSalvador');
const { resolverPoliticaFacturacion } = require('./facturacionOrigenService');

const CONFIG = {
  ambiente: SIMULATION.ambiente,
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
const redondeo8 = (v) => Math.round((Number(v) + Number.EPSILON) * 1e8) / 1e8;
const fmtFecha = fechaElSalvador;
const fmtHora = horaElSalvador;
const uuidV4 = () => crypto.randomUUID().toUpperCase();
const esperarReintentoMH = () => new Promise((resolve) => setTimeout(resolve, 250));

const assertNoActiveDte = (rows) => {
  if (rows && rows.length) {
    throw new Error(`La reserva ya tiene un DTE activo (${rows[0].control_number}, ${rows[0].transmission_status})`);
  }
};

const emitirInterno = async (opciones, conn) => {
  const { reservation_id, tipo_dte, receptor: override, contingencia, requiereDeduccionFiscal = false } = opciones;
  const cont = contingencia || null;
  if (!['01', '03'].includes(tipo_dte)) throw new Error('Tipo de DTE no soportado (use 01 FE o 03 CCFE)');
  if (cont && ![1, 2, 3, 4, 5].includes(Number(cont.tipoContingencia))) throw new Error('Tipo de contingencia inválido (CAT-005)');
  if (cont?.motivoContin != null && typeof cont.motivoContin !== 'string') throw new Error('El motivo de contingencia debe ser texto');
  if (cont && Number(cont.tipoContingencia) === 5 && !cont.motivoContin?.trim()) throw new Error('Indique el motivo de contingencia para el tipo 5');
  if (cont?.motivoContin && cont.motivoContin.length > 500) throw new Error('El motivo de contingencia no puede exceder 500 caracteres');

  const [res] = await conn.query(
    `SELECT r.*, c.first_names AS c_first, c.last_names AS c_last, c.email AS c_email,
            c.phone AS c_phone, c.document_type AS c_doctype, c.document_number AS c_docnum
     FROM reservations r LEFT JOIN customers c ON c.id = r.customer_id WHERE r.id = ?`,
    [reservation_id]
  );
  if (res.length === 0) throw new Error('Reserva no encontrada');
  const reserva = res[0];
  const politicaFacturacion = await resolverPoliticaFacturacion(reservation_id, conn);
  if (politicaFacturacion.tipo === 'recibo_venta') {
    throw new Error('No aplica DTE salvadoreño: el primer vuelo no sale de El Salvador. Emita el recibo de venta.');
  }
  if (politicaFacturacion.tipo === 'revision_manual') {
    throw new Error('No se puede emitir el DTE hasta confirmar manualmente el país de origen del primer vuelo.');
  }
  if (reserva.status !== 'paid') throw new Error('La reserva debe estar en estado PAGADA para emitir DTE');

  const [pax] = await conn.query('SELECT * FROM passengers WHERE reservation_id = ? ORDER BY id', [reservation_id]);
  if (pax.length === 0) throw new Error('La reserva no tiene pasajeros');
  const [vuelos] = await conn.query(
    `SELECT DISTINCT f.flight_number, f.departure_datetime FROM flight_segments fs
     JOIN flights f ON f.id = fs.flight_id WHERE fs.reservation_id = ? ORDER BY f.departure_datetime`,
    [reservation_id]
  );
  const vuelosTxt = vuelos.map((v) => v.flight_number).join(', ');
  const [pagos] = await conn.query(
    "SELECT * FROM payments WHERE reservation_id = ? AND status = 'approved' AND type = 'payment' ORDER BY id ASC",
    [reservation_id]
  );
  const [refunds] = await conn.query("SELECT original_payment_id, SUM(amount) AS amount FROM payments WHERE reservation_id = ? AND type = 'refund' AND status = 'refunded' GROUP BY original_payment_id", [reservation_id]);
  const refundMap = new Map(refunds.map(p => [p.original_payment_id, Number(p.amount)]));
  const formasPago = pagos.map(p => ({ codigo: CAT017[p.method] || '01', montoPago: redondeo(Number(p.amount) - (refundMap.get(p.id) || 0)), referencia: p.method === 'cash' ? null : p.external_reference, plazo: null, periodo: null })).filter(p => p.montoPago > 0);
  if (Math.abs(redondeo(formasPago.reduce((s, p) => s + p.montoPago, 0)) - Number(reserva.estimated_total)) > 0.001) throw new Error('Los pagos netos no concilian con el total de la reserva');

  // Los tributos NO se calculan aquí: se toman de las líneas fiscales que se
  // congelaron en la reserva a partir de las reglas de "Fiscalidad y tasas".
  // Si no hay reglas registradas, el DTE no lleva impuestos.
  // - Reglas de El Salvador  -> tributos del DTE (IVA = código 20).
  // - Reglas de otros países -> cargos de terceros (noGravado): la aerolínea
  //   los cobra por cuenta de la autoridad extranjera y no son tributos del MH.
  const [lineasFiscales] = await conn.query(
    `SELECT rtl.passenger_id, rtl.code, rtl.name, rtl.amount, c.code AS country_code
     FROM reservation_tax_lines rtl LEFT JOIN countries c ON c.id = rtl.country_id
     WHERE rtl.reservation_id = ? ORDER BY rtl.id`,
    [reservation_id]
  );
  const PAIS_EMISOR = 'SV';
  const esLocal = (l) => !l.country_code || String(l.country_code).toUpperCase() === PAIS_EMISOR;
  const esIVA = (code) => ['20', 'IVA'].includes(String(code || '').toUpperCase());
  const codigoTributo = (code) => (esIVA(code) ? '20' : String(code));
  const impuestosPorPax = new Map(pax.map((p) => [p.id, { iva: 0, otros: new Map(), terceros: 0 }]));
  const tributosResumen = new Map();
  const cargosTerceros = new Map();
  let totalImpuestos = 0;
  for (const l of lineasFiscales) {
    const monto = Number(l.amount) || 0;
    totalImpuestos += monto;
    const destino = impuestosPorPax.get(l.passenger_id);
    if (!esLocal(l)) {
      const clave = String(l.country_code).toUpperCase() + ' ' + l.code;
      const previo = cargosTerceros.get(clave) || { clave, nombre: l.name, valor: 0 };
      previo.valor += monto;
      cargosTerceros.set(clave, previo);
      if (destino) destino.terceros += monto;
      continue;
    }
    const codigo = codigoTributo(l.code);
    const previo = tributosResumen.get(codigo) || { codigo, descripcion: l.name, valor: 0 };
    previo.valor += monto;
    tributosResumen.set(codigo, previo);
    if (!destino) continue;
    if (esIVA(l.code)) destino.iva += monto;
    else destino.otros.set(codigo, (destino.otros.get(codigo) || 0) + monto);
  }
  const [segmentos] = await conn.query('SELECT passenger_id, SUM(total_price) AS base FROM flight_segments WHERE reservation_id = ? GROUP BY passenger_id', [reservation_id]);
  const bases = new Map(segmentos.map(s => [s.passenger_id, redondeo8(s.base)]));
  const [servicios] = await conn.query("SELECT ra.id, ra.price, ra.iva_amount, a.name FROM reservation_ancillaries ra JOIN ancillaries a ON a.id = ra.ancillary_id WHERE ra.reservation_id = ? AND ra.status = 'active' ORDER BY ra.id", [reservation_id]);
  const baseTotal = [...bases.values()].reduce((a, b) => a + b, 0) + servicios.reduce((a, b) => a + Number(b.price), 0);
  if (pax.some(p => !bases.has(p.id)) || Math.abs(redondeo(baseTotal + totalImpuestos) - Number(reserva.estimated_total)) > 0.001) throw new Error('Las tarifas, servicios e impuestos guardados no concilian con la reserva');
  for (const servicio of servicios) {
    const ivaServicio = Number(servicio.iva_amount) || 0;
    if (ivaServicio > 0) {
      const previo = tributosResumen.get('20') || { codigo: '20', descripcion: 'IVA', valor: 0 };
      previo.valor += ivaServicio;
      tributosResumen.set('20', previo);
    }
  }
  const itemsServicio = servicios.map((s, i) => {
    const precio = Number(s.price);
    const ivaItem = Number(s.iva_amount) || 0;
    const precioNeto = redondeo(precio - ivaItem);
    const esFactura = tipo_dte === '01';
    return {
      numItem: pax.length + i + 1, cantidad: 1, tipoItem: 2, codigo: 'SERV-' + s.id,
      codTributo: !esFactura && ivaItem > 0 ? '20' : null, uniMedida: 99,
      descripcion: s.name, precioUni: esFactura ? precio : precioNeto, montoDescu: 0,
      ventaNoSuj: 0, ventaExenta: 0, ventaGravada: esFactura ? precio : precioNeto,
      tributos: !esFactura && ivaItem > 0 ? ['20'] : null, ivaItem: esFactura ? ivaItem : 0,
      psv: 0, noGravado: 0
    };
  });
  const tributosLista = (filtro) => {
    const lista = [...tributosResumen.values()].filter((t) => filtro(t.codigo)).map((t) => ({ ...t, valor: redondeo(t.valor) }));
    return lista.length ? lista : null;
  };
  const totalNoGravado = redondeo([...cargosTerceros.values()].reduce((s, c) => s + c.valor, 0));

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

  const corr = await siguienteControl(tipo_dte, conn);
  const identificacion = {
    version: VERSIONES_DTE[tipo_dte],
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
    // FE: el precio unitario incluye el IVA registrado (si existe); los demás
    // tributos de Fiscalidad y tasas se informan aparte y se suman al total.
    cuerpo = pax.map((p, i) => {
      const imp = impuestosPorPax.get(p.id);
      const precioPorPax = bases.get(p.id);
      const ivaItem = redondeo8(imp.iva);
      const ventaGravada = redondeo8(precioPorPax + ivaItem);
      const otros = [...imp.otros.keys()];
      return {
        numItem: i + 1, cantidad: 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: null, uniMedida: 99,
        descripcion: 'Boleto aéreo - ' + p.first_names + ' ' + p.last_names + ' (Vuelos: ' + vuelosTxt + ')',
        precioUni: ventaGravada, montoDescu: 0, ventaNoSuj: 0, ventaExenta: 0, ventaGravada: ventaGravada,
        tributos: otros.length ? otros : null, ivaItem: ivaItem, psv: 0, noGravado: redondeo(imp.terceros)
      };
    });
    cuerpo.push(...itemsServicio);
    const totalGravada = redondeo(cuerpo.reduce((s, it) => s + it.ventaGravada, 0));
    const totalIva = redondeo(cuerpo.reduce((s, it) => s + it.ivaItem, 0));
    const otrosTributos = tributosLista((c) => c !== '20');
    const totalOtros = redondeo((otrosTributos || []).reduce((s, t) => s + t.valor, 0));
    const montoOperacion = redondeo(totalGravada + totalOtros);
    const total = redondeo(montoOperacion + totalNoGravado);
    resumen = {
      totalNoSuj: 0, totalExenta: 0, totalGravada: totalGravada, subTotalVentas: totalGravada,
      descuNoSuj: 0, descuExenta: 0, descuGravada: 0, porcentajeDescuento: 0, totalDescu: 0,
      tributos: otrosTributos, subTotal: totalGravada, ivaRete: 0, totalIva: totalIva,
      montoTotalOperacion: montoOperacion, totalNoGravado: totalNoGravado, totalPagar: total, totalLetras: null,
      condicionOperacion: 1,
      pagos: formasPago,
      numPagoElectronico: null, observaciones: null
    };
  } else {
    // CCFE: precio sin impuestos; todos los tributos registrados se suman encima.
    cuerpo = pax.map((p, i) => {
      const imp = impuestosPorPax.get(p.id);
      const precioPorPax = bases.get(p.id);
      const codigos = [...(imp.iva > 0 ? ['20'] : []), ...imp.otros.keys()];
      return {
        numItem: i + 1, cantidad: 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: codigos.length ? codigos[0] : null, uniMedida: 99,
        descripcion: 'Boleto aéreo - ' + p.first_names + ' ' + p.last_names + ' (Vuelos: ' + vuelosTxt + ')',
        precioUni: precioPorPax, montoDescu: 0, ventaNoSuj: 0, ventaExenta: 0, ventaGravada: precioPorPax,
        tributos: codigos.length ? codigos : null, psv: 0, noGravado: redondeo(imp.terceros)
      };
    });
    cuerpo.push(...itemsServicio);
    const totalGravada = redondeo(cuerpo.reduce((s, it) => s + it.ventaGravada, 0));
    const tributos = tributosLista(() => true);
    const montoOperacion = redondeo(totalGravada + (tributos || []).reduce((s, t) => s + t.valor, 0));
    const total = redondeo(montoOperacion + totalNoGravado);
    resumen = {
      totalNoSuj: 0, totalExenta: 0, totalGravada: totalGravada, subTotalVentas: totalGravada,
      descuNoSuj: 0, descuExenta: 0, descuGravada: 0, porcentajeDescuento: 0, totalDescu: 0,
      tributos: tributos, subTotal: totalGravada, ivaPerci: 0, ivaRete: 0,
      montoTotalOperacion: montoOperacion, totalNoGravado: totalNoGravado, totalPagar: total, totalLetras: null,
      condicionOperacion: 1,
      pagos: formasPago,
      numPagoElectronico: null, observaciones: null
    };
  }

  const apendice = [
    { campo: 'PNR', etiqueta: 'Código de reserva', valor: reserva.pnr },
    { campo: 'VUELOS', etiqueta: 'Vuelos facturados', valor: vuelosTxt }
  ];
  if (cargosTerceros.size) {
    // Detalle de lo cobrado por cuenta de autoridades extranjeras (no gravado).
    apendice.push({
      campo: 'TERCEROS', etiqueta: 'Cargos por cuenta de terceros',
      valor: [...cargosTerceros.values()].map((c) => c.clave + ' ' + c.nombre + ': ' + redondeo(c.valor).toFixed(2)).join('; ').slice(0, 150)
    });
  }

  const dte = {
    simulacion: SIMULATION,
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
    apendice: apendice
  };

  const validacion = validarDTECompleto(dte, tipo_dte, { requiereDeduccionFiscal, receptorExtranjero: String(dte.receptor.tipoDocumento) === '3' });
  if (!validacion.valido) throw new Error(validacion.errores.join('; '));

  const ivaGuardado = tipo_dte === '01' ? resumen.totalIva : redondeo((tributosResumen.get('20') || { valor: 0 }).valor);
  const estadoInicial = cont ? 'contingency' : 'transmitted';
  await conn.beginTransaction();
  let head;
  try {
    // Serializar la emisión por reserva. El bloqueo evita que dos solicitudes
    // simultáneas creen facturas (FE/CCFE) duplicadas para la misma venta.
    const [reservaBloqueada] = await conn.query(
      'SELECT id, status FROM reservations WHERE id = ? FOR UPDATE',
      [reservation_id]
    );
    if (!reservaBloqueada.length || reservaBloqueada[0].status !== 'paid') {
      throw new Error('La reserva debe seguir pagada al momento de emitir el DTE');
    }
    const [dtePrevio] = await conn.query(
      `SELECT uuid_generation, control_number, transmission_status FROM dte_headers
       WHERE reservation_id = ? AND dte_type IN ('01', '03')
         AND transmission_status IN ('draft', 'transmitted', 'accepted', 'contingency')
       ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [reservation_id]
    );
    assertNoActiveDte(dtePrevio);
    [head] = await conn.query(
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
      await conn.query(
        `INSERT INTO dte_items (header_id, item_number, item_type, quantity, unit_measure, description, unit_price, discount_amount, sale_non_taxable, sale_exempt, sale_taxable, vat_item, tribute_code)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
        [head.insertId, it.numItem, it.tipoItem, it.uniMedida, it.descripcion, it.precioUni, it.montoDescu, it.ventaGravada, it.ivaItem || 0, it.codTributo]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw new Error('Error al guardar DTE en base de datos: ' + err.message);
  }

  if (cont) {
    return { dteId: head.insertId, uuid: identificacion.codigoGeneracion, numeroControl: identificacion.numeroControl, estado: 'contingency', sello: null, errores: null, dte: dte };
  }

  // RF-003: antes de contingencia se intenta transmitir tres veces. En el
  // simulador la disponibilidad la controla el interruptor persistente de MH.
  let ok = false;
  let intentos = 0;
  for (; intentos < 3; intentos += 1) {
    if (await mhSimulator.estaOperativo()) { ok = true; break; }
    if (intentos < 2) await esperarReintentoMH();
  }
  let estado, sello = null, errores = null;
  if (ok) { estado = 'accepted'; sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase(); }
  else { estado = 'contingency'; errores = ['Simulador local no disponible tras 3 intentos; contingencia simulada']; }
  await conn.query('UPDATE dte_headers SET transmission_status = ?, reception_seal = ?, reception_date = NOW() WHERE id = ?', [estado, sello, head.insertId]);
  if (estado === 'contingency') {
    dte.identificacion.tipoModelo = 2;
    dte.identificacion.tipoOperacion = 2;
    dte.identificacion.tipoContingencia = 1;
    await conn.query('UPDATE dte_headers SET billing_model = 2, operation_type = 2, full_json = ? WHERE id = ?', [JSON.stringify(dte), head.insertId]);
  }
  return { dteId: head.insertId, uuid: identificacion.codigoGeneracion, numeroControl: identificacion.numeroControl, estado: estado, sello: sello, errores: errores, intentosMH: intentos + (ok ? 1 : 0), dte: dte };
};

const emitirDTE = (opciones) => serializarEmision(conn => emitirInterno(opciones, conn));

module.exports = { emitirDTE: emitirDTE, assertNoActiveDte, CONFIG: CONFIG, fmtFecha: fmtFecha, fmtHora: fmtHora, uuidV4: uuidV4 };
