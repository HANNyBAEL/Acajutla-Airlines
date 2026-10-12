const pool = require('../config/db');
const crypto = require('crypto');
const { CONFIG, fmtFecha, fmtHora, uuidV4 } = require('./dteService');
const fiscalCompliance = require('./fiscalCompliance');

const FECHAS_EVENTO_DTE = new Set(['03', '04', '05', '06', '07', '08', '09', '15']);
const TIPOS_INVALIDACION = new Set([1, 2, 3]);
const TIPOS_DOCUMENTO_PERSONA = new Set(['13', '36', '3']);
const TIPOS_SIN_REEMPLAZO = new Set(['05', '08']);

// mysql2 is configured with dateStrings:true. Parse SQL dates as local calendar
// dates instead of letting new Date('YYYY-MM-DD') shift them to the prior day.
const parseFechaHoraLocal = (valor) => {
  if (valor instanceof Date) return new Date(valor.getTime());
  if (typeof valor !== 'string') return null;
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?/);
  if (!m) return null;
  const [hh = '00', mm = '00', ss = '00', ms = '0'] = m.slice(4);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(hh), Number(mm), Number(ss), Number(ms.padEnd(3, '0')));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
};

const fechaSql = (valor) => {
  if (typeof valor === 'string') {
    const m = valor.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = parseFechaHoraLocal(valor);
  if (!d) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fechaHoraFormulario = (fecha, hora) => {
  if (typeof fecha !== 'string' || typeof hora !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const d = parseFechaHoraLocal(`${fecha} ${hora}:00`);
  if (!d || d.getHours() !== Number(hora.slice(0, 2)) || d.getMinutes() !== Number(hora.slice(3, 5))) return null;
  return d;
};

const validarPersonaEvento = (persona, etiqueta) => {
  if (typeof persona?.nombre !== 'string' || typeof persona?.numDoc !== 'string' || !persona.nombre.trim() || !persona.numDoc.trim() || !TIPOS_DOCUMENTO_PERSONA.has(String(persona?.tipoDoc))) {
    throw new Error(`Complete nombre, tipo y número de documento de ${etiqueta}`);
  }
  if (persona.nombre.trim().length > 100 || persona.numDoc.trim().length > 20) throw new Error(`Los datos de ${etiqueta} exceden la longitud permitida`);
};

const sumarMesesFinDeMes = (fecha, meses) => {
  const dia = fecha.getDate();
  const limite = new Date(fecha.getFullYear(), fecha.getMonth() + meses + 1, 0);
  const resultado = new Date(fecha.getFullYear(), fecha.getMonth() + meses, Math.min(dia, limite.getDate()));
  resultado.setHours(23, 59, 59, 999);
  return resultado;
};

const limiteDiezDiasHabiles = (fechaSello) => {
  const limite = new Date(fechaSello.getFullYear(), fechaSello.getMonth() + 1, 1);
  let contados = 0;
  while (contados < 10) {
    if (limite.getDay() !== 0 && limite.getDay() !== 6) contados++;
    if (contados < 10) limite.setDate(limite.getDate() + 1);
  }
  limite.setHours(23, 59, 59, 999);
  return limite;
};

let _esquemaContingenciaActual = null;
const esquemaContingenciaActual = async () => {
  if (_esquemaContingenciaActual === null) {
    const [columns] = await pool.query('SHOW COLUMNS FROM contingency_events');
    _esquemaContingenciaActual = columns.some((column) => column.Field === 'uuid');
  }
  return _esquemaContingenciaActual;
};

const combinarFechaHora = (fecha, hora) => {
  if (!fecha) return null;
  const h = hora && hora.length >= 5 ? hora : '00:00';
  return `${fecha} ${h.length === 5 ? h + ':00' : h}`;
};

const listarPendientes = async () => {
  const [rows] = await pool.query(
    `SELECT h.*, r.pnr FROM dte_headers h LEFT JOIN reservations r ON r.id = h.reservation_id
     WHERE h.transmission_status = 'contingency'
        OR (h.transmission_status = 'transmitted' AND h.reception_seal IS NULL)
     ORDER BY h.id`
  );
  return rows;
};

const resolverEmployeeId = async (usuarioId) => {
  if (!usuarioId) {
    const [any] = await pool.query('SELECT id FROM employees ORDER BY id LIMIT 1');
    return any.length ? any[0].id : 1;
  }
  // Intentar primero como employee_id directo
  const [empCheck] = await pool.query('SELECT id FROM employees WHERE id = ?', [usuarioId]);
  if (empCheck.length) return usuarioId;
  // Si no existe en employees, buscar en users → employee_id
  const [usr] = await pool.query('SELECT employee_id FROM users WHERE id = ?', [usuarioId]);
  if (usr.length && usr[0].employee_id) return usr[0].employee_id;
  // Fallback: primer empleado disponible
  const [any] = await pool.query('SELECT id FROM employees ORDER BY id LIMIT 1');
  return any.length ? any[0].id : 1;
};

const transmitirEventoContingencia = async (datos, usuarioId = null) => {
  if (!datos || ![1, 2, 3, 4, 5].includes(Number(datos.tipoContingencia))) throw new Error('Tipo de contingencia inválido (CAT-005)');
  const inicio = fechaHoraFormulario(datos.fInicio, datos.hInicio);
  const fin = fechaHoraFormulario(datos.fFin, datos.hFin);
  const ahora = new Date();
  if (!inicio || !fin) throw new Error('Complete fechas y horas válidas del período de contingencia');
  if (inicio > fin) throw new Error('El inicio de la contingencia debe ser anterior al final');
  if (fin > ahora) throw new Error('El final de la contingencia no puede estar en el futuro');
  if (ahora.getTime() - fin.getTime() > 24 * 60 * 60 * 1000) throw new Error('El evento de contingencia debe transmitirse dentro de las 24 horas posteriores al cese');
  if (datos.motivoContingencia != null && typeof datos.motivoContingencia !== 'string') throw new Error('El motivo de contingencia debe ser texto');
  if (datos.motivoContingencia && datos.motivoContingencia.length > 500) throw new Error('El motivo de contingencia no puede exceder 500 caracteres');
  if (Number(datos.tipoContingencia) === 5 && !datos.motivoContingencia?.trim()) throw new Error('Indique el motivo para el tipo de contingencia 5');
  validarPersonaEvento(datos.responsable, 'responsable');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let ids = datos.dte_ids && datos.dte_ids.length ? datos.dte_ids : null;
    if (!ids) {
      const [pendientes] = await conn.query(
        `SELECT id FROM dte_headers WHERE transmission_status = 'contingency'
         OR (transmission_status = 'transmitted' AND reception_seal IS NULL) ORDER BY id FOR UPDATE`
      );
      ids = pendientes.map((d) => d.id);
    }
    if (!ids.length) throw new Error('No hay DTEs pendientes de contingencia');
    if (ids.length > 1000) throw new Error('El lote no puede exceder 1000 DTEs');
    if (new Set(ids.map(Number)).size !== ids.length || ids.some((id) => !Number.isInteger(Number(id)) || Number(id) < 1)) throw new Error('La selección contiene identificadores de DTE inválidos o repetidos');
    const [docs] = await conn.query(
      `SELECT id, dte_type, uuid_generation, transmission_status, emission_date, emission_time FROM dte_headers
       WHERE id IN (?) AND (transmission_status = 'contingency'
          OR (transmission_status = 'transmitted' AND reception_seal IS NULL)) FOR UPDATE`,
      [ids]
    );
    if (!docs.length) throw new Error('Ninguno de los DTEs seleccionados está en contingencia');
    if (docs.length !== ids.length) throw new Error('Todos los DTEs seleccionados deben estar pendientes de contingencia');
    for (const doc of docs) {
      const fecha = fechaSql(doc.emission_date);
      const hora = doc.emission_time ? String(doc.emission_time).slice(0, 5) : '00:00';
      const generado = fecha && fechaHoraFormulario(fecha, hora);
      if (!generado || generado < inicio || generado > fin) throw new Error(`El DTE ${doc.uuid_generation} está fuera del período de contingencia`);
    }
    // Normalizar DTEs huérfanos a contingencia antes de transmitir evento
    const huerfanos = docs.filter((d) => d.transmission_status === 'transmitted');
    if (huerfanos.length) {
      await conn.query(
        "UPDATE dte_headers SET transmission_status = 'contingency', billing_model = 2, operation_type = 2 WHERE id IN (?)",
        [huerfanos.map((d) => d.id)]
      );
    }
    const uuid = uuidV4();
    const evento = {
      identificacion: {
        version: 3, ambiente: CONFIG.ambiente, tipoModelo: 2, tipoOperacion: 2,
        tipoContingencia: Number(datos.tipoContingencia),
        motivoContin: Number(datos.tipoContingencia) === 5 ? datos.motivoContingencia.trim() : null,
        codigoGeneracion: uuid,
        fTransmision: fmtFecha(ahora), hTransmision: fmtHora(ahora)
      },
      emisor: {
        nit: CONFIG.nit, nombre: CONFIG.nombre,
        nombreResponsable: datos.responsable.nombre.trim(),
        tipoDocResponsable: String(datos.responsable.tipoDoc),
        numeroDocResponsable: datos.responsable.numDoc.trim(),
        tipoEstablecimiento: '2',
        telefono: CONFIG.telefono, correo: CONFIG.correo
      },
      detalleDTE: docs.map((d, i) => ({ noItem: i + 1, tipoDoc: d.dte_type, codigoGeneracion: d.uuid_generation })),
      motivo: {
        fInicio: datos.fInicio, fFin: datos.fFin, hInicio: datos.hInicio, hFin: datos.hFin,
        tipoContingencia: Number(datos.tipoContingencia),
        motivoContingencia: Number(datos.tipoContingencia) === 5 ? datos.motivoContingencia.trim() : null
      }
    };

    const usaEsquemaActual = await esquemaContingenciaActual();
    const motivo = evento.identificacion.motivoContin;
    const employeeId = usaEsquemaActual ? null : await resolverEmployeeId(usuarioId);
    let ev;
    if (usaEsquemaActual) {
      [ev] = await conn.query(
        `INSERT INTO contingency_events (uuid, fecha_inicio, fecha_fin, hora_inicio, hora_fin, tipo_contingencia, motivo_contingencia, responsable_nombre, responsable_tipo_doc, responsable_num_doc, documentos_count, estado, full_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transmitido', ?)`,
        [uuid, datos.fInicio, datos.fFin, datos.hInicio, datos.hFin, Number(datos.tipoContingencia),
          motivo, datos.responsable.nombre.trim(), String(datos.responsable.tipoDoc), datos.responsable.numDoc.trim(), docs.length, JSON.stringify(evento)]
      );
    } else {
      [ev] = await conn.query(
        `INSERT INTO contingency_events (event_uuid, contingency_type, reason, start_date, end_date, responsible_name, responsible_document, status, affected_documents, full_json, registered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
        [uuid, Number(datos.tipoContingencia), motivo,
          combinarFechaHora(datos.fInicio, datos.hInicio), combinarFechaHora(datos.fFin, datos.hFin),
          datos.responsable.nombre.trim(), datos.responsable.numDoc.trim(), docs.length, JSON.stringify(evento), employeeId]
      );
    }
    for (const d of docs) {
      await conn.query('INSERT INTO contingency_event_docs (event_id, dte_id) VALUES (?, ?)', [ev.insertId, d.id]);
    }
    const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
    if (usaEsquemaActual) {
      await conn.query("UPDATE contingency_events SET estado = 'aceptado', sello = ? WHERE id = ?", [sello, ev.insertId]);
    } else {
      await conn.query("UPDATE contingency_events SET status = 'transmitted', reception_seal = ? WHERE id = ?", [sello, ev.insertId]);
    }
    await conn.query(
      "UPDATE dte_headers SET transmission_status = 'accepted', reception_seal = ?, reception_date = NOW() WHERE id IN (?)",
      [sello, docs.map((d) => d.id)]
    );
    await conn.commit();
    return { event_id: ev.insertId, uuid: uuid, sello: sello, documentos: docs.length, evento: evento };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

const invalidarDTE = async (uuidDte, datos) => {
  const tipoAnulacion = Number(datos?.tipoAnulacion);
  if (!TIPOS_INVALIDACION.has(tipoAnulacion)) throw new Error('Tipo de invalidación inválido (CAT-024)');
  if (typeof datos.motivo !== 'string' || !datos.motivo.trim()) throw new Error('Indique el motivo de la invalidación');
  if (datos.motivo.trim().length > 200) throw new Error('El motivo de invalidación no puede exceder 200 caracteres');
  validarPersonaEvento(datos.responsable, 'responsable');
  validarPersonaEvento(datos.solicitante, 'solicitante');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [h] = await conn.query('SELECT * FROM dte_headers WHERE uuid_generation = ? FOR UPDATE', [uuidDte]);
    if (!h.length) throw new Error('DTE no encontrado');
    const doc = h[0];
    if (doc.transmission_status !== 'accepted' || !doc.reception_seal) throw new Error('Solo se pueden invalidar DTEs con Sello de Recepción (aceptados)');

    const ahora = new Date();
    const fechaTransmisionDTE = parseFechaHoraLocal(doc.reception_date || doc.created_at);
    const fechaGeneracion = parseFechaHoraLocal(doc.emission_date);
    if (!fechaTransmisionDTE || !fechaGeneracion) throw new Error('El DTE tiene fechas inválidas y no se puede determinar su plazo');
    const tipoDte = String(doc.dte_type);
    if (!['01', '11', '14'].includes(tipoDte) && !FECHAS_EVENTO_DTE.has(tipoDte)) throw new Error('Tipo de DTE no soportado para invalidación');
    if (fechaGeneracion > parseFechaHoraLocal(fechaSql(ahora))) throw new Error('La fecha de generación del DTE no puede estar en el futuro');
    let fechaEvento;
    if (!FECHAS_EVENTO_DTE.has(tipoDte)) {
      fechaEvento = fechaSql(ahora);
      const eventoDate = parseFechaHoraLocal(fechaEvento);
      if (eventoDate < fechaGeneracion || eventoDate > sumarMesesFinDeMes(fechaGeneracion, 3)) {
        throw new Error('La fecha del evento debe estar entre la fecha de generación del DTE y los 3 meses posteriores');
      }
      if (ahora > sumarMesesFinDeMes(fechaTransmisionDTE, 3)) throw new Error('El plazo de 3 meses desde el Sello de Recepción para invalidar este documento ha expirado.');
    } else {
      fechaEvento = fechaSql(doc.emission_date);
      const limite = limiteDiezDiasHabiles(fechaTransmisionDTE);
      if (ahora > limite) throw new Error('El plazo de 10 días hábiles del mes siguiente para invalidar ha expirado.');
    }

    const requiereReemplazo = [1, 3].includes(tipoAnulacion) && !TIPOS_SIN_REEMPLAZO.has(tipoDte);
    let codigoReemplazo = null;
    if (requiereReemplazo) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(datos.codigoReemplazo || '')) {
        throw new Error('Debe indicar el código de generación del DTE de reemplazo');
      }
      const [reemplazos] = await conn.query('SELECT id, dte_type, transmission_status, reception_seal FROM dte_headers WHERE uuid_generation = ? FOR UPDATE', [datos.codigoReemplazo]);
      const reemplazo = reemplazos[0];
      if (!reemplazo || reemplazo.id === doc.id || String(reemplazo.dte_type) !== tipoDte || reemplazo.transmission_status !== 'accepted' || !reemplazo.reception_seal) {
        throw new Error('El DTE de reemplazo debe existir, ser del mismo tipo y estar aceptado con Sello de Recepción');
      }
      codigoReemplazo = datos.codigoReemplazo;
    }

    const uuid = uuidV4();
    const evento = {
      identificacion: {
        version: 3, ambiente: CONFIG.ambiente, codigoGeneracion: uuid,
        fecCEmi: fechaEvento, horEmi: fmtHora(ahora), fusion: null
      },
      emisor: { nit: CONFIG.nit, nombre: CONFIG.nombre, telefono: CONFIG.telefono, correo: CONFIG.correo },
      documento: {
        tipoDte: doc.dte_type, codigoGeneracion: doc.uuid_generation, selloRecibido: doc.reception_seal,
        numeroControl: doc.control_number, fecEmi: fechaSql(doc.emission_date),
        codigoGeneracionR: codigoReemplazo,
        tipoDocumento: doc.receiver_doc_type, numDocumento: doc.receiver_doc_number,
        nombre: doc.receiver_name, telefono: null, correo: null
      },
      motivo: {
        tipoAnulacion: tipoAnulacion, motivoAnulacion: datos.motivo.trim(),
        nombreResponsable: datos.responsable.nombre.trim(), tipDocResponsable: String(datos.responsable.tipoDoc), numDocResponsable: datos.responsable.numDoc.trim(),
        nombreSolicita: datos.solicitante.nombre.trim(), tipDocSolicita: String(datos.solicitante.tipoDoc), numDocSolicita: datos.solicitante.numDoc.trim()
      }
    };

    const [ev] = await conn.query(
      `INSERT INTO dte_invalidation_events (uuid, dte_id, tipo_invalidacion, motivo, responsable_nombre, responsable_tipo_doc, responsable_num_doc, solicitante_nombre, solicitante_tipo_doc, solicitante_num_doc, codigo_reemplazo, estado, full_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aceptado', ?)`,
      [uuid, doc.id, tipoAnulacion, evento.motivo.motivoAnulacion, evento.motivo.nombreResponsable, evento.motivo.tipDocResponsable, evento.motivo.numDocResponsable,
       evento.motivo.nombreSolicita, evento.motivo.tipDocSolicita, evento.motivo.numDocSolicita, codigoReemplazo, JSON.stringify(evento)]
    );
    const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
    await conn.query('UPDATE dte_invalidation_events SET sello = ? WHERE id = ?', [sello, ev.insertId]);
    await conn.query("UPDATE dte_headers SET transmission_status = 'invalidated' WHERE id = ?", [doc.id]);
    await conn.commit();
    return { event_id: ev.insertId, uuid: uuid, sello: sello, evento: evento };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

const parseJsonDb = (value) => {
  if (!value) return {};
  return typeof value === 'string' ? JSON.parse(value) : value;
};

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const identidadRetorno = (doc) => {
  const j = parseJsonDb(doc.full_json);
  return {
    emisor: j.emisor?.nit || doc.issuer_nit || '',
    receptor: JSON.stringify(j.receptor || { nombre: doc.receiver_name, tipoDocumento: doc.receiver_doc_type, numDocumento: doc.receiver_doc_number }),
    tercero: JSON.stringify(j.ventaTercero || null),
    pais: j.receptor?.codPais || null,
    regimen: j.emisor?.regimen || j.emisor?.tipoRegimen || null,
    recinto: j.emisor?.recintoFiscal || null,
    tipoExportacion: j.emisor?.tipoItemExpor || null
  };
};

const totalDocumento = (doc) => {
  const j = parseJsonDb(doc.full_json);
  const total = Number(j.resumen?.totalPagar ?? doc.total_to_pay);
  if (!Number.isFinite(total) || total <= 0) throw new Error(`El DTE ${doc.uuid_generation} no tiene un total válido para retornos`);
  return money(total);
};

const retornadoAntes = async (conn, doc, total) => {
  const [filas] = await conn.query(
    'SELECT returned_amount FROM dte_return_events WHERE dte_id = ? FOR UPDATE',
    [doc.id]
  );
  let amount = 0;
  for (const row of filas) {
    const previo = Number(row.returned_amount || 0);
    // Una fila antigua no guardaba el importe. Se considera consumido el total
    // del DTE por seguridad, hasta que un operador concilie ese historial.
    amount += previo > 0 ? previo : total;
  }

  // Compatibilidad con eventos antiguos creados por /fiscal/evento-retorno,
  // que se guardaban en fiscal_events y repartían el monto equitativamente.
  let legacy = [];
  try {
    [legacy] = await conn.query(
      `SELECT dte_uuids, full_json FROM fiscal_events
       WHERE tipo_evento = 'retorno' AND JSON_CONTAINS(dte_uuids, JSON_QUOTE(?))`,
      [doc.uuid_generation]
    );
  } catch (error) {
    if (!['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) throw error;
  }
  for (const event of legacy) {
    const uuids = parseJsonDb(event.dte_uuids);
    const full = parseJsonDb(event.full_json);
    const cantidad = Array.isArray(uuids) ? uuids.length : 0;
    if (!cantidad) continue;
    const montoEvento = Number(full.resumen?.totalPagar || 0);
    amount += montoEvento > 0 ? money(montoEvento / cantidad) : total;
  }
  return money(amount);
};

const repartirMonto = (montoCents, capacidades) => {
  const totalCapacidad = capacidades.reduce((sum, x) => sum + x.cents, 0);
  if (montoCents > totalCapacidad) throw new Error('El monto del retorno supera el saldo retornable de los DTE seleccionados');
  const preliminar = capacidades.map((x) => {
    const exacto = totalCapacidad ? (montoCents * x.cents) / totalCapacidad : 0;
    const cents = Math.floor(exacto);
    return { id: x.id, cents, resto: exacto - cents };
  });
  let sobra = montoCents - preliminar.reduce((sum, x) => sum + x.cents, 0);
  preliminar.slice().sort((a, b) => b.resto - a.resto).forEach((x) => {
    if (sobra > 0 && x.cents < capacidades.find((c) => c.id === x.id).cents) { x.cents += 1; sobra -= 1; }
  });
  return preliminar.filter((x) => x.cents > 0).map((x) => ({ id: x.id, amount: x.cents / 100 }));
};

const buildRetorno = (docs, allocaciones, motivo, ahora, uuid) => {
  const porId = new Map(allocaciones.map((x) => [Number(x.id), x.amount]));
  let gravada = 0, compra = 0, impuesto = 0;
  let numeroItem = 0;
  const cuerpo = docs.map((doc) => {
    const dte = parseJsonDb(doc.full_json);
    const amount = porId.get(Number(doc.id));
    if (amount == null) return null;
    const esFSEE = String(doc.dte_type) === '14';
    const resumenOriginal = dte.resumen || {};
    const brutoOriginal = totalDocumento(doc);
    const tributosOriginales = Array.isArray(resumenOriginal.tributos) ? resumenOriginal.tributos : [];
    const ivaOriginal = Number(resumenOriginal.totalIva || resumenOriginal.totaliva || 0);
    const otrosOriginales = tributosOriginales.reduce((sum, t) => sum + (String(t.codigo) === '20' ? 0 : Number(t.valor || 0)), 0);
    const noGravadoOriginal = Number(resumenOriginal.totalNoGravado || 0);
    const factor = brutoOriginal > 0 ? amount / brutoOriginal : 0;
    const retenidoOriginal = Number(resumenOriginal.reteRenta || 0);
    const compraOriginal = Number(resumenOriginal.totalCompra || resumenOriginal.totalCompraExcluidos || resumenOriginal.subTotal || brutoOriginal);
    const tasaRetencion = esFSEE && compraOriginal > 0 ? Math.min(0.99, retenidoOriginal / compraOriginal) : 0;
    const compraItem = esFSEE && tasaRetencion > 0 ? money(amount / (1 - tasaRetencion)) : amount;
    const retencionItem = esFSEE ? money(compraItem * tasaRetencion) : 0;
    const impuestoItem = esFSEE ? 0 : money((ivaOriginal + otrosOriginales) * factor);
    const noGravado = esFSEE ? 0 : money(noGravadoOriginal * factor);
    const base = esFSEE ? 0 : money(Math.max(0, amount - impuestoItem - noGravado));
    gravada = money(gravada + base);
    compra = money(compra + (esFSEE ? compraItem : 0));
    impuesto = money(impuesto + impuestoItem);
    return {
      numItem: ++numeroItem,
      numeroDocumento: doc.uuid_generation, tipoItem: 1,
      cantidad: 1, codigo: null, uniMedida: 59,
      descripcion: String(motivo || 'Retorno / reembolso').slice(0, 1000),
      precioUni: esFSEE ? compraItem : base, montoDescu: 0,
      ventaNoSuj: 0, ventaExenta: 0, ventaGravada: base,
      compra: esFSEE ? compraItem : 0,
      tributos: impuestoItem > 0 ? ['20'] : null,
      ivaRete: 0, reteRenta: retencionItem, seguro: 0, flete: 0, noGravado: noGravado
    };
  }).filter(Boolean);
  const noGravado = money(cuerpo.reduce((sum, item) => sum + Number(item.noGravado || 0), 0));
  const retencion = money(cuerpo.reduce((sum, item) => sum + Number(item.reteRenta || 0), 0));
  const subtotal = money(gravada + compra);
  const total = money(subtotal + impuesto + noGravado);
  const primerDte = parseJsonDb(docs[0].full_json);
  const evento = {
    identificacion: {
      version: 1, ambiente: CONFIG.ambiente, tipoModelo: 1, tipoOperacion: 1,
      tipoContingencia: null, motivoContin: null, codigoGeneracion: uuid,
      tipoEvento: '18', fecCEmi: fmtFecha(ahora), horEmi: fmtHora(ahora),
      fusion: null, tipoMoneda: 'USD'
    },
    documentosRelacionados: docs.filter((d) => porId.has(Number(d.id))).map((d) => ({
      tipoDocumento: String(d.dte_type), tipoGeneracion: 2,
      numeroDocumento: d.uuid_generation, fechaGeneracion: fechaSql(d.emission_date)
    })),
    emisor: primerDte.emisor,
    receptor: primerDte.receptor,
    ventaTercero: primerDte.ventaTercero || null,
    compraTercero: primerDte.compraTercero || null,
    cuerpoDocumento: cuerpo,
    resumen: {
      totalNoSuj: 0, totalExenta: 0, totalGravada: gravada,
      totalCompraExcluidos: compra, subTotalVentas: subtotal,
      totalNoGravado: noGravado, totalSeguro: 0, totalFlete: 0,
      montoTotalOperacion: money(subtotal + impuesto), ivaRetenido: 0,
      reteRenta: retencion,
      tributos: impuesto > 0 ? [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado', valor: impuesto }] : null,
      totalPagar: money(total - retencion), totalLetras: null, totalNoOnerosas: 0,
      totaliva: impuesto, saldoFavor: 0
    },
    apendice: null
  };
  fiscalCompliance.firmar(evento);
  return evento;
};

const retornarDTEs = async (uuids, datos = {}) => {
  if (!Array.isArray(uuids) || uuids.length < 1 || uuids.length > 50) throw new Error('Seleccione entre 1 y 50 DTE para el retorno');
  if (new Set(uuids).size !== uuids.length || uuids.some((u) => typeof u !== 'string' || !u.trim())) throw new Error('La selección contiene códigos de generación inválidos o repetidos');
  const monto = Number(datos.monto);
  if (!Number.isFinite(monto) || monto <= 0 || Math.abs(monto * 100 - Math.round(monto * 100)) > 0.000001) throw new Error('Ingrese un monto de retorno válido con máximo dos decimales');
  const motivo = String(datos.motivo || datos.descripcion || '').trim();
  if (!motivo || motivo.length > 255) throw new Error('Indique una descripción del retorno (máximo 255 caracteres)');

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const [rows] = await conn.query(
      'SELECT * FROM dte_headers WHERE uuid_generation IN (?) ORDER BY id FOR UPDATE',
      [uuids]
    );
    if (rows.length !== uuids.length) throw new Error('Algún DTE seleccionado no existe');
    const byUuid = new Map(rows.map((d) => [d.uuid_generation, d]));
    const docs = uuids.map((u) => byUuid.get(u));
    if (docs.some((doc) => doc.transmission_status !== 'accepted' || !doc.reception_seal)) throw new Error('Todos los DTE deben estar aceptados y tener sello de recepción');
    if (docs.some((doc) => !['01', '11', '14'].includes(String(doc.dte_type)))) throw new Error('El retorno solo aplica a FE (01), FEXE (11) o FSEE (14)');
    if (new Set(docs.map((d) => String(d.dte_type))).size !== 1) throw new Error('Todos los DTE deben ser del mismo tipo');
    const identidad = identidadRetorno(docs[0]);
    if (docs.some((d) => {
      const actual = identidadRetorno(d);
      return actual.emisor !== identidad.emisor || actual.receptor !== identidad.receptor || actual.tercero !== identidad.tercero
        || actual.pais !== identidad.pais || actual.regimen !== identidad.regimen
        || actual.recinto !== identidad.recinto || actual.tipoExportacion !== identidad.tipoExportacion;
    })) throw new Error('Los DTE relacionados deben compartir emisor, receptor, tercero y datos de exportación');

    const ahora = new Date();
    const capacidades = [];
    for (const doc of docs) {
      const sello = parseFechaHoraLocal(doc.reception_date || doc.created_at);
      const generacion = parseFechaHoraLocal(doc.emission_date);
      if (!sello || !generacion) throw new Error(`El DTE ${doc.uuid_generation} tiene fechas inválidas`);
      const limiteSello = sumarMesesFinDeMes(sello, 3);
      // El manual admite hasta 2 años para FE/FEXE de determinadas
      // actividades; los demás tipos y actividades conservan el plazo de 3 meses.
      const emisor = parseJsonDb(doc.full_json).emisor || {};
      const actividad = String(emisor.codActividad || '');
      const plazoMeses = ['01', '11'].includes(String(doc.dte_type))
        && ['01282', '21001', '46484', '47721'].includes(actividad) ? 24 : 3;
      const limiteGeneracion = sumarMesesFinDeMes(generacion, plazoMeses);
      if (generacion > ahora) throw new Error(`El DTE ${doc.uuid_generation} tiene fecha de generación futura`);
      if (ahora > limiteSello || ahora > limiteGeneracion) throw new Error(`El DTE ${doc.uuid_generation} está fuera del plazo permitido para retorno`);
      const total = totalDocumento(doc);
      const usado = await retornadoAntes(conn, doc, total);
      const disponible = money(total - usado);
      if (disponible < 0) throw new Error(`El historial de retornos del DTE ${doc.uuid_generation} excede su total; requiere conciliación`);
      capacidades.push({ id: Number(doc.id), cents: Math.round(disponible * 100) });
    }
    const allocaciones = repartirMonto(Math.round(monto * 100), capacidades);
    const uuid = uuidV4();
    const evento = buildRetorno(docs, allocaciones, motivo, ahora, uuid);
    const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
    fiscalCompliance.sellar(evento, sello);
    let eventId = null;
    for (const asignacion of allocaciones) {
      const doc = docs.find((d) => Number(d.id) === asignacion.id);
      const [ev] = await conn.query(
        `INSERT INTO dte_return_events
          (uuid, dte_id, motivo, responsable_nombre, responsable_tipo_doc, responsable_num_doc, estado, sello, returned_amount, full_json)
         VALUES (?, ?, ?, ?, ?, ?, 'aceptado', ?, ?, ?)`,
        [uuid, doc.id, motivo, datos.responsable?.nombre || null, datos.responsable?.tipoDoc || null,
          datos.responsable?.numDoc || null, sello, asignacion.amount, JSON.stringify(evento)]
      );
      if (eventId == null) eventId = ev.insertId;
    }
    await conn.commit();
    return { event_id: eventId, uuid, sello, monto: evento.resumen.totalPagar, documentos: allocaciones.length, asignaciones: allocaciones, evento };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
};

const retornarDTE = async (uuidDte, datos) => retornarDTEs([uuidDte], datos);

const operacionesEspeciales = async (datos) => {
  const uuid = uuidV4();
  const evento = {
    identificacion: {
      version: 1, ambiente: CONFIG.ambiente, codigoGeneracion: uuid,
      fechaEvento: fmtFecha(new Date()), horaEvento: fmtHora(new Date())
    },
    emisor: {
      nit: CONFIG.nit, nombre: CONFIG.nombre,
      tipoEstablecimiento: '2', telefono: CONFIG.telefono, correo: CONFIG.correo
    },
    motivo: {
      descripcion: datos.motivo || 'Operaciones Especiales Mensuales',
      responsable: { nombre: datos.responsable?.nombre, tipoDocumento: datos.responsable?.tipoDoc, numDocumento: datos.responsable?.numDoc }
    },
    documentos: datos.documentos || []
  };
  const [ev] = await pool.query('INSERT INTO dte_special_operations_events (uuid, periodo, tipo_documento, responsable_nombre, full_json) VALUES (?, ?, ?, ?, ?)', [uuid, datos.periodo || '2026-09', datos.tipoDocumento || 'Factura Simplificada', datos.responsable?.nombre, JSON.stringify(evento)]);
  const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
  await pool.query('UPDATE dte_special_operations_events SET sello = ? WHERE id = ?', [sello, ev.insertId]);
  return { event_id: ev.insertId, uuid: uuid, sello: sello, evento: evento };
};

const listarEventos = async () => {
  // La base de datos previa usa la nomenclatura en inglés. Se conserva la
  // compatibilidad mientras las instalaciones nuevas usan el esquema actual.
  const usaEsquemaActual = await esquemaContingenciaActual();
  const [cont] = await pool.query(
    usaEsquemaActual
      ? 'SELECT id, uuid, fecha_inicio, fecha_fin, tipo_contingencia, documentos_count, estado, sello, created_at FROM contingency_events ORDER BY id DESC'
      : `SELECT id, event_uuid AS uuid, DATE(start_date) AS fecha_inicio,
                DATE(end_date) AS fecha_fin, contingency_type AS tipo_contingencia,
                affected_documents AS documentos_count,
                CASE WHEN status = 'transmitted' THEN 'aceptado' ELSE status END AS estado,
                reception_seal AS sello, created_at
         FROM contingency_events ORDER BY id DESC`
  );
  const [inv] = await pool.query(
    `SELECT i.id, i.uuid, i.tipo_invalidacion, i.motivo, i.estado, i.sello, i.created_at, h.control_number, h.dte_type
     FROM dte_invalidation_events i JOIN dte_headers h ON h.id = i.dte_id ORDER BY i.id DESC`
  );
  return { contingencia: cont, invalidacion: inv };
};

module.exports = { listarPendientes, transmitirEventoContingencia, invalidarDTE, retornarDTE, retornarDTEs, operacionesEspeciales, listarEventos };
