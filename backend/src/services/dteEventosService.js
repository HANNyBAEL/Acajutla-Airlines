const pool = require('../config/db');
const crypto = require('crypto');
const { CONFIG, fmtFecha, fmtHora, uuidV4 } = require('./dteService');

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
  let ids = datos.dte_ids && datos.dte_ids.length ? datos.dte_ids : (await listarPendientes()).map((d) => d.id);
  if (!ids.length) throw new Error('No hay DTEs pendientes de contingencia');
  if (ids.length > 1000) ids = ids.slice(0, 1000);
  const [docs] = await pool.query(
    `SELECT id, dte_type, uuid_generation, transmission_status FROM dte_headers
     WHERE id IN (?) AND (transmission_status = 'contingency'
        OR (transmission_status = 'transmitted' AND reception_seal IS NULL))`,
    [ids]
  );
  if (!docs.length) throw new Error('Ninguno de los DTEs seleccionados está en contingencia');
  // Normalizar DTEs huérfanos a contingencia antes de transmitir evento
  const huerfanos = docs.filter((d) => d.transmission_status === 'transmitted');
  if (huerfanos.length) {
    await pool.query(
      "UPDATE dte_headers SET transmission_status = 'contingency', billing_model = 2, operation_type = 2 WHERE id IN (?)",
      [huerfanos.map((d) => d.id)]
    );
  }
  if (!datos.responsable?.nombre || !datos.responsable?.numDoc) {
    throw new Error('Complete los datos del responsable');
  }

  const uuid = uuidV4();
  const evento = {
    identificacion: {
      version: 3, ambiente: CONFIG.ambiente, tipoModelo: 2, tipoOperacion: 2,
      tipoContingencia: Number(datos.tipoContingencia),
      motivoContin: Number(datos.tipoContingencia) === 5 ? (datos.motivoContingencia || null) : null,
      codigoGeneracion: uuid,
      fTransmision: fmtFecha(new Date()), hTransmision: fmtHora(new Date())
    },
    emisor: {
      nit: CONFIG.nit, nombre: CONFIG.nombre,
      nombreResponsable: datos.responsable.nombre,
      tipoDocResponsable: datos.responsable.tipoDoc,
      numeroDocResponsable: datos.responsable.numDoc,
      tipoEstablecimiento: '2',
      telefono: CONFIG.telefono, correo: CONFIG.correo
    },
    detalleDTE: docs.map((d, i) => ({ noItem: i + 1, tipoDoc: d.dte_type, codigoGeneracion: d.uuid_generation })),
    motivo: {
      fInicio: datos.fInicio, fFin: datos.fFin, hInicio: datos.hInicio, hFin: datos.hFin,
      tipoContingencia: Number(datos.tipoContingencia),
      motivoContingencia: Number(datos.tipoContingencia) === 5 ? (datos.motivoContingencia || null) : null
    }
  };

  const usaEsquemaActual = await esquemaContingenciaActual();
  const motivo = evento.identificacion.motivoContin;
  const employeeId = usaEsquemaActual ? null : await resolverEmployeeId(usuarioId);
  let ev;
  if (usaEsquemaActual) {
    [ev] = await pool.query(
      `INSERT INTO contingency_events (uuid, fecha_inicio, fecha_fin, hora_inicio, hora_fin, tipo_contingencia, motivo_contingencia, responsable_nombre, responsable_tipo_doc, responsable_num_doc, documentos_count, estado, full_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'transmitido', ?)`,
      [uuid, datos.fInicio, datos.fFin, datos.hInicio, datos.hFin, Number(datos.tipoContingencia),
        motivo, datos.responsable.nombre, datos.responsable.tipoDoc, datos.responsable.numDoc, docs.length, JSON.stringify(evento)]
    );
  } else {
    [ev] = await pool.query(
      `INSERT INTO contingency_events (event_uuid, contingency_type, reason, start_date, end_date, responsible_name, responsible_document, status, affected_documents, full_json, registered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
      [uuid, Number(datos.tipoContingencia), motivo,
        combinarFechaHora(datos.fInicio, datos.hInicio), combinarFechaHora(datos.fFin, datos.hFin),
        datos.responsable.nombre, datos.responsable.numDoc, docs.length, JSON.stringify(evento),
        employeeId]
    );
  }
  for (const d of docs) {
    await pool.query('INSERT INTO contingency_event_docs (event_id, dte_id) VALUES (?, ?)', [ev.insertId, d.id]);
  }
  const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
  if (usaEsquemaActual) {
    await pool.query("UPDATE contingency_events SET estado = 'aceptado', sello = ? WHERE id = ?", [sello, ev.insertId]);
  } else {
    await pool.query("UPDATE contingency_events SET status = 'transmitted', reception_seal = ? WHERE id = ?", [sello, ev.insertId]);
  }
  await pool.query(
    "UPDATE dte_headers SET transmission_status = 'accepted', reception_seal = ?, reception_date = NOW() WHERE id IN (?)",
    [sello, docs.map((d) => d.id)]
  );
  return { event_id: ev.insertId, uuid: uuid, sello: sello, documentos: docs.length, evento: evento };
};

const invalidarDTE = async (uuidDte, datos) => {
  const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuidDte]);
  if (!h.length) throw new Error('DTE no encontrado');
  const doc = h[0];
  if (doc.transmission_status !== 'accepted') throw new Error('Solo se pueden invalidar DTEs con Sello de Recepción (aceptados)');

  const uuid = uuidV4();

  const fechaTransmisionDTE = doc.reception_date ? new Date(doc.reception_date) : new Date(doc.created_at);
  const ahora = new Date();
  if (['01', '11', '14'].includes(doc.dte_type)) {
    const limite = new Date(fechaTransmisionDTE);
    limite.setMonth(limite.getMonth() + 3);
    if (ahora > limite) throw new Error('El plazo de 3 meses para invalidar este documento ha expirado.');
  } else {
    const limite = new Date(fechaTransmisionDTE.getFullYear(), fechaTransmisionDTE.getMonth() + 1, 1);
    let diasHabiles = 0;
    while (diasHabiles < 10) {
      const dia = limite.getDay();
      if (dia !== 0 && dia !== 6) diasHabiles++;
      if (diasHabiles < 10) limite.setDate(limite.getDate() + 1);
    }
    limite.setHours(23, 59, 59, 999);
    if (ahora > limite) throw new Error('El plazo de 10 días hábiles del mes siguiente para invalidar ha expirado.');
  }

  const requiereMismaFecha = ['03', '04', '05', '06', '07', '08', '09', '15'].includes(doc.dte_type);
  const fechaEvento = requiereMismaFecha ? fmtFecha(doc.emission_date) : fmtFecha(new Date());
  const nulaReemplazo = Number(datos.tipoAnulacion) === 2 || ['05', '07'].includes(doc.dte_type);

  const evento = {
    identificacion: {
      version: 3, ambiente: CONFIG.ambiente, codigoGeneracion: uuid,
      fecCEmi: fechaEvento, horEmi: fmtHora(new Date()), fusion: null
    },
    emisor: { nit: CONFIG.nit, nombre: CONFIG.nombre, telefono: CONFIG.telefono, correo: CONFIG.correo },
    documento: {
      tipoDte: doc.dte_type, codigoGeneracion: doc.uuid_generation, selloRecibido: doc.reception_seal,
      numeroControl: doc.control_number, fecEmi: fmtFecha(doc.emission_date),
      codigoGeneracionR: nulaReemplazo ? null : (datos.codigoReemplazo || null),
      tipoDocumento: doc.receiver_doc_type, numDocumento: doc.receiver_doc_number,
      nombre: doc.receiver_name, telefono: null, correo: null
    },
    motivo: {
      tipoAnulacion: Number(datos.tipoAnulacion), motivoAnulacion: datos.motivo,
      nombreResponsable: datos.responsable.nombre, tipDocResponsable: datos.responsable.tipoDoc, numDocResponsable: datos.responsable.numDoc,
      nombreSolicita: datos.solicitante.nombre, tipDocSolicita: datos.solicitante.tipoDoc, numDocSolicita: datos.solicitante.numDoc
    }
  };

  const [ev] = await pool.query(
    `INSERT INTO dte_invalidation_events (uuid, dte_id, tipo_invalidacion, motivo, responsable_nombre, responsable_tipo_doc, responsable_num_doc, solicitante_nombre, solicitante_tipo_doc, solicitante_num_doc, codigo_reemplazo, estado, full_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aceptado', ?)`,
    [uuid, doc.id, Number(datos.tipoAnulacion), datos.motivo, datos.responsable.nombre, datos.responsable.tipoDoc, datos.responsable.numDoc,
     datos.solicitante.nombre, datos.solicitante.tipoDoc, datos.solicitante.numDoc, datos.codigoReemplazo || null, JSON.stringify(evento)]
  );
  const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
  await pool.query('UPDATE dte_invalidation_events SET sello = ? WHERE id = ?', [sello, ev.insertId]);
  await pool.query("UPDATE dte_headers SET transmission_status = 'invalidated' WHERE id = ?", [doc.id]);
  return { event_id: ev.insertId, uuid: uuid, sello: sello, evento: evento };
};

const retornarDTE = async (uuidDte, datos) => {
  const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuidDte]);
  if (!h.length) throw new Error('DTE no encontrado');
  const doc = h[0];
  if (doc.transmission_status !== 'accepted') throw new Error('Solo se puede retornar de DTEs con Sello de Recepcin (aceptados)');
  if (!['01', '11', '14'].includes(doc.dte_type)) throw new Error('El evento de retorno solo aplica a FE, FEXE o FSEE');
  const fechaTransmisionDTE = new Date(doc.reception_date || doc.created_at);
  const ahora = new Date();
  const limite = new Date(fechaTransmisionDTE);
  limite.setMonth(limite.getMonth() + 3);
  if (ahora > limite) throw new Error('El plazo legal de 3 meses para emitir un evento de retorno ha expirado');
  const uuid = uuidV4();
  const evento = {
    identificacion: { version: 1, ambiente: CONFIG.ambiente, codigoGeneracion: uuid, fechaEvento: fmtFecha(ahora), horaEvento: fmtHora(ahora) },
    emisor: { nit: CONFIG.nit, nombre: CONFIG.nombre, tipoEstablecimiento: '2', telefono: CONFIG.telefono, correo: CONFIG.correo },
    documentosRelacionados: [{ tipoDocumento: doc.dte_type, codigoGeneracion: doc.uuid_generation, fechaGeneracion: fmtFecha(doc.emission_date) }],
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
