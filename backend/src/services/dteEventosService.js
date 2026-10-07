const pool = require('../config/db');
const crypto = require('crypto');
const { CONFIG, fmtFecha, fmtHora, uuidV4 } = require('./dteService');

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

const retornarDTE = async (uuidDte, datos) => {
  const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuidDte]);
  if (!h.length) throw new Error('DTE no encontrado');
  const doc = h[0];
  if (doc.transmission_status !== 'accepted') throw new Error('Solo se puede retornar de DTEs con Sello de Recepcin (aceptados)');
  if (!['01', '11', '14'].includes(doc.dte_type)) throw new Error('El evento de retorno solo aplica a FE, FEXE o FSEE');
  const fechaTransmisionDTE = parseFechaHoraLocal(doc.reception_date || doc.created_at);
  if (!fechaTransmisionDTE) throw new Error('El DTE tiene una fecha de recepción inválida');
  const ahora = new Date();
  const limite = sumarMesesFinDeMes(fechaTransmisionDTE, 3);
  if (ahora > limite) throw new Error('El plazo legal de 3 meses para emitir un evento de retorno ha expirado');
  const uuid = uuidV4();
  const evento = {
    identificacion: { version: 1, ambiente: CONFIG.ambiente, codigoGeneracion: uuid, fechaEvento: fmtFecha(ahora), horaEvento: fmtHora(ahora) },
    emisor: { nit: CONFIG.nit, nombre: CONFIG.nombre, tipoEstablecimiento: '2', telefono: CONFIG.telefono, correo: CONFIG.correo },
    documentosRelacionados: [{ tipoDocumento: doc.dte_type, codigoGeneracion: doc.uuid_generation, fechaGeneracion: fechaSql(doc.emission_date) }],
    motivo: { descripcion: datos.motivo, responsable: { nombre: datos.responsable?.nombre, tipoDocumento: datos.responsable?.tipoDoc, numDocumento: datos.responsable?.numDoc } }
  };
  const [ev] = await pool.query('INSERT INTO dte_return_events (uuid, dte_id, motivo, responsable_nombre, responsable_tipo_doc, responsable_num_doc, full_json) VALUES (?, ?, ?, ?, ?, ?, ?)', [uuid, doc.id, datos.motivo, datos.responsable?.nombre, datos.responsable?.tipoDoc, datos.responsable?.numDoc, JSON.stringify(evento)]);
  const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
  await pool.query('UPDATE dte_return_events SET sello = ? WHERE id = ?', [sello, ev.insertId]);
  await pool.query('UPDATE dte_headers SET transmission_status = ? WHERE id = ?', ['returned', doc.id]);
  return { event_id: ev.insertId, uuid: uuid, sello: sello, evento: evento };
};

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

module.exports = { listarPendientes, transmitirEventoContingencia, invalidarDTE, retornarDTE, operacionesEspeciales, listarEventos };
