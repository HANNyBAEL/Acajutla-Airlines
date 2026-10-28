const pool = require('../config/db');
const { fechaElSalvador } = require('../utils/fechaElSalvador');

// ---------- WAITLIST ----------
const listarWaitlist = async (req, res) => {
  try {
    const { flight_id, status } = req.query;
    let sql = 'SELECT w.*, f.flight_number FROM waitlist w JOIN flights f ON f.id = w.flight_id WHERE 1=1';
    const params = [];
    if (flight_id) { sql += ' AND w.flight_id = ?'; params.push(flight_id); }
    if (status) { sql += ' AND w.status = ?'; params.push(status); }
    sql += ' ORDER BY w.position ASC, w.id ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const agregarWaitlist = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { flight_id, passenger_name, passenger_email, passenger_doc, doc_type, requested_class, notes } = req.body;
    if (!flight_id || !passenger_name) {
      await connection.rollback();
      return res.status(400).json({ error: 'Vuelo y nombre son obligatorios' });
    }
    const [v] = await connection.query(
      `SELECT f.id, f.flight_number, at.total_capacity,
        (SELECT COUNT(DISTINCT fs.passenger_id) FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id
         WHERE fs.flight_id = f.id AND r.status IN ('pending','confirmed','paid')) AS ocupados
       FROM flights f JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id
       WHERE f.id = ? FOR UPDATE`, [flight_id]);
    if (!v.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Vuelo no encontrado' });
    }
    if (v[0].ocupados < v[0].total_capacity) {
      await connection.rollback();
      return res.status(409).json({ error: 'El vuelo aún tiene asientos disponibles; no requiere lista de espera', disponibles: v[0].total_capacity - v[0].ocupados });
    }
    const [max] = await connection.query("SELECT COALESCE(MAX(position),0) AS m FROM waitlist WHERE flight_id = ? AND status = 'waiting' FOR UPDATE", [flight_id]);
    const posicion = max[0].m + 1;
    const [r] = await connection.query(
      'INSERT INTO waitlist (flight_id, passenger_name, passenger_email, passenger_doc, doc_type, requested_class, notes, position) VALUES (?,?,?,?,?,?,?,?)',
      [flight_id, passenger_name, passenger_email || null, passenger_doc || null, doc_type || null, requested_class || null, notes || null, posicion]);
    await connection.commit();
    res.status(201).json({ exito: true, datos: { id: r.insertId, posicion: posicion }, mensaje: 'Agregado a lista de espera en posición #' + posicion });
  } catch (e) {
    await connection.rollback();
    res.status(500).json({ error: 'Error interno' });
  } finally {
    connection.release();
  }
};

const actualizarWaitlist = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['waiting','offered','confirmed','notified','expired','cancelled'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });
    const extra = status === 'notified' ? ', notified_at = NOW()' : '';
    await pool.query('UPDATE waitlist SET status = ?' + extra + ' WHERE id = ?', [status, req.params.id]);
    res.json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

// ---------- ANCILLARIES ----------
const listarAncillaries = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ancillaries ORDER BY type, code');
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const sincronizarInventarioPredeterminado = async (ancillaryId, connection) => {
  await connection.query(
    `INSERT IGNORE INTO flight_ancillaries (flight_id, ancillary_id, stock, price_override, active)
     SELECT f.id, a.id, a.default_stock, NULL, 1
     FROM flights f JOIN ancillaries a ON a.id = ?
     WHERE a.active = 1 AND a.default_stock > 0
       AND f.status = 'scheduled' AND f.departure_datetime > NOW()`,
    [ancillaryId]
  );
};

const crearAncillary = async (req, res) => {
  let connection;
  try {
    const { code, name, type, description, base_price } = req.body;
    const defaultStock = Number(req.body.default_stock ?? 0);
    if (!code || !name || !type || base_price === undefined) return res.status(400).json({ error: 'code, name, type y base_price son obligatorios' });
    if (!Number.isInteger(defaultStock) || defaultStock < 0 || defaultStock > 100000) return res.status(400).json({ error: 'La cantidad predeterminada debe ser un entero entre 0 y 100000' });
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [r] = await connection.query('INSERT INTO ancillaries (code, name, type, description, base_price, default_stock) VALUES (?,?,?,?,?,?)',
      [code.toUpperCase(), name, type, description || null, base_price, defaultStock]);
    await sincronizarInventarioPredeterminado(r.insertId, connection);
    await connection.commit();
    res.status(201).json({ exito: true, datos: { id: r.insertId } });
  } catch (e) {
    if (connection) await connection.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    console.error('Error al crear ancillary:', e);
    res.status(500).json({ error: 'Error interno' });
  } finally { if (connection) connection.release(); }
};

const actualizarAncillary = async (req, res) => {
  let connection;
  try {
    const allowed = ['code', 'name', 'type', 'description', 'base_price', 'active', 'default_stock'];
    const entries = Object.entries(req.body).filter(([key]) => allowed.includes(key));
    if (!entries.length) return res.status(400).json({ error: 'No hay campos para actualizar' });
    for (const [key, value] of entries) {
      if (['code', 'name', 'type'].includes(key) && (typeof value !== 'string' || !value.trim())) return res.status(400).json({ error: 'Texto obligatorio: ' + key });
      if (key === 'base_price' && (!Number.isFinite(Number(value)) || Number(value) < 0)) return res.status(400).json({ error: 'Precio inválido' });
      if (key === 'active' && ![true, false, 0, 1].includes(value)) return res.status(400).json({ error: 'active debe ser booleano' });
      if (key === 'default_stock' && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 100000)) return res.status(400).json({ error: 'La cantidad predeterminada debe ser un entero entre 0 y 100000' });
    }
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [existentes] = await connection.query('SELECT id FROM ancillaries WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!existentes.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    const valores = entries.map(([key, value]) => key === 'default_stock' ? Number(value) : value);
    await connection.query('UPDATE ancillaries SET ' + entries.map(([key]) => key + ' = ?').join(', ') + ' WHERE id = ?', [...valores, req.params.id]);
    await sincronizarInventarioPredeterminado(req.params.id, connection);
    await connection.commit();
    res.json({ exito: true });
  } catch (e) {
    if (connection) await connection.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' });
    console.error('Error al actualizar ancillary:', e);
    res.status(500).json({ error: 'Error interno' });
  } finally { if (connection) connection.release(); }
};

const asignarAncillaryVuelo = async (req, res) => {
  try {
    const { flight_id, ancillary_id, stock, price_override } = req.body;
    if (!flight_id || !ancillary_id || stock === undefined) return res.status(400).json({ error: 'flight_id, ancillary_id y stock son obligatorios' });
    await pool.query(
      'INSERT INTO flight_ancillaries (flight_id, ancillary_id, stock, price_override) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE stock = VALUES(stock), price_override = VALUES(price_override)',
      [flight_id, ancillary_id, stock, price_override || null]);
    res.status(201).json({ exito: true });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const ancillariesDeVuelo = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT fa.*, a.code, a.name, a.type, a.description, COALESCE(fa.price_override, a.base_price) AS precio_final
       FROM flight_ancillaries fa JOIN ancillaries a ON a.id = fa.ancillary_id
       WHERE fa.flight_id = ? AND fa.active = 1 AND a.active = 1 ORDER BY a.type, a.code`, [req.params.flightId]);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reservasParaAncillaries = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.pnr, r.status, r.estimated_total, r.paid_total, r.time_limit
       FROM reservations r
       WHERE r.status = 'pending' AND COALESCE(r.paid_total, 0) = 0
         AND (r.time_limit IS NULL OR r.time_limit > NOW())
         AND NOT EXISTS (
           SELECT 1 FROM dte_headers dh
           WHERE dh.reservation_id = r.id AND dh.transmission_status IN ('accepted','transmitted','contingency')
         )
       ORDER BY r.created_at DESC LIMIT 200`
    );
    res.json({ exito: true, datos: rows });
  } catch (e) {
    console.error('Error al listar reservas disponibles para servicios:', e);
    res.status(500).json({ error: 'No se pudieron cargar las reservas disponibles para servicios' });
  }
};

const vuelosDeReservaAncillaries = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT fs.flight_id, f.flight_number, f.departure_datetime,
              ao.iata_code AS origin_iata, ad.iata_code AS destination_iata
       FROM flight_segments fs
       JOIN flights f ON f.id = fs.flight_id
       JOIN routes rt ON rt.id = f.route_id
       JOIN airports ao ON ao.id = rt.origin_id
       JOIN airports ad ON ad.id = rt.destination_id
       WHERE fs.reservation_id = ?
       ORDER BY f.departure_datetime`,
      [req.params.reservationId]
    );
    res.json({ exito: true, datos: rows });
  } catch (e) {
    console.error('Error al listar vuelos de reserva para servicios:', e);
    res.status(500).json({ error: 'No se pudieron cargar los vuelos de la reserva' });
  }
};

const agregarAncillaryReserva = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const { reservation_id, passenger_id, flight_id, ancillary_id, quantity } = req.body;
    const qty = Number(quantity ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) throw Object.assign(new Error('La cantidad debe ser un entero entre 1 y 100'), { statusCode: 400 });
    if (!reservation_id || !flight_id || !ancillary_id) throw Object.assign(new Error('Selecciona reserva, vuelo y servicio'), { statusCode: 400 });
    const [reservas] = await conn.query('SELECT *, (time_limit IS NOT NULL AND time_limit < NOW()) AS vencida FROM reservations WHERE id = ? FOR UPDATE', [reservation_id]);
    const reserva = reservas[0];
    if (!reserva) throw Object.assign(new Error('La reserva seleccionada ya no existe'), { statusCode: 404 });
    if (reserva.status !== 'pending' || Number(reserva.paid_total) > 0 || Number(reserva.vencida)) {
      throw Object.assign(new Error('Solo puedes agregar servicios a una reserva pendiente, vigente y sin pagos'), { statusCode: 409 });
    }
    const [rel] = await conn.query('SELECT id FROM flight_segments WHERE reservation_id = ? AND flight_id = ? AND (? IS NULL OR passenger_id = ?)', [reservation_id, flight_id, passenger_id || null, passenger_id || null]);
    if (!rel.length) throw Object.assign(new Error('El vuelo o pasajero seleccionado no pertenece a esta reserva'), { statusCode: 400 });
    const [docs] = await conn.query("SELECT id FROM dte_headers WHERE reservation_id = ? AND transmission_status IN ('accepted','transmitted','contingency')", [reservation_id]);
    if (docs.length) throw Object.assign(new Error('No se puede modificar una reserva que ya tiene una factura válida'), { statusCode: 409 });
    const [fa] = await conn.query('SELECT * FROM flight_ancillaries WHERE flight_id = ? AND ancillary_id = ? AND active = 1 FOR UPDATE', [flight_id, ancillary_id]);
    if (!fa.length) throw Object.assign(new Error('Este servicio no está configurado para el vuelo de la reserva'), { statusCode: 409 });
    if (Number(fa[0].stock) < qty) throw Object.assign(new Error('No hay inventario suficiente para este servicio'), { statusCode: 409 });
    const [a] = await conn.query('SELECT base_price FROM ancillaries WHERE id = ? AND active = 1', [ancillary_id]);
    if (!a.length) throw Object.assign(new Error('El servicio seleccionado está inactivo'), { statusCode: 409 });
    const precio = fa[0].price_override ?? a[0].base_price;
    const total = precio * qty;
    let r;
    for (let unit = 0; unit < qty; unit++) {
      [r] = await conn.query("INSERT INTO reservation_ancillaries (reservation_id, passenger_id, flight_id, ancillary_id, price, status) VALUES (?,?,?,?,?,'active')", [reservation_id, passenger_id || null, flight_id, ancillary_id, precio]);
    }
    await conn.query('UPDATE flight_ancillaries SET stock = stock - ? WHERE id = ?', [qty, fa[0].id]);
    await conn.query('UPDATE reservations SET estimated_total = estimated_total + ? WHERE id = ?', [total, reservation_id]);
    await conn.commit();
    res.status(201).json({ exito: true, datos: { id: r.insertId, precio: precio, total: total }, mensaje: 'Servicio agregado y sumado al total' });
  } catch (e) {
    if (conn) await conn.rollback();
    console.error('Error al vender ancillary a reserva:', e);
    const status = e.statusCode || 500;
    res.status(status).json({ error: status < 500 ? e.message : 'Error interno al vender el servicio' });
  } finally { if (conn) conn.release(); }
};

const ancillariesDeReserva = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ra.*, a.code, a.name, a.type FROM reservation_ancillaries ra JOIN ancillaries a ON a.id = ra.ancillary_id
       WHERE ra.reservation_id = ? ORDER BY ra.id`, [req.params.reservationId]);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

// ---------- REPORTES ----------
const kpi = async (req, res) => {
  try {
    const hoy = fechaElSalvador();
    const [vh] = await pool.query('SELECT status, COUNT(*) AS c FROM flights WHERE DATE(departure_datetime) = ? GROUP BY status', [hoy]);
    const map = {}; vh.forEach((x) => { map[x.status] = x.c; });
    const [pax] = await pool.query('SELECT COUNT(DISTINCT p.id) AS t FROM passengers p JOIN reservations r ON r.id = p.reservation_id WHERE r.created_at >= (NOW() - INTERVAL 24 HOUR)');
    const [cap] = await pool.query(
      `SELECT SUM(at.total_capacity) AS cap, COALESCE(SUM(oc.n),0) AS ocu FROM flights f
       JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id
       LEFT JOIN (
         SELECT fs.flight_id, COUNT(DISTINCT fs.passenger_id) AS n
         FROM flight_segments fs
         JOIN reservations rx ON rx.id = fs.reservation_id
         WHERE rx.status IN ('pending','confirmed','paid')
         GROUP BY fs.flight_id
       ) oc ON oc.flight_id = f.id
       WHERE DATE(f.departure_datetime) = ?`, [hoy]);
    const [wl] = await pool.query("SELECT COUNT(*) AS t FROM waitlist WHERE status='waiting'");
    const datosOperativos = {
      vuelosHoy: { programados: map.scheduled || 0, en_curso: map.in_progress || 0, completados: map.completed || 0, cancelados: map.cancelled || 0 },
      pax24h: pax[0].t, ocupacionHoy: cap[0].cap ? Math.round((cap[0].ocu / cap[0].cap) * 100) : 0,
      waitlistActivas: wl[0].t
    };
    if (req.usuario.rol === 'operations') return res.json({ exito: true, datos: datosOperativos });
    const [ventas] = await pool.query("SELECT COALESCE(SUM(amount),0) AS t FROM payments WHERE status='approved' AND type='payment' AND DATE(CONVERT_TZ(payment_date, 'UTC', 'America/El_Salvador')) = ?", [hoy]);
    const [dte] = await pool.query("SELECT COALESCE(SUM(transmission_status='accepted'),0) AS ok, COALESCE(SUM(transmission_status='rejected'),0) AS bad, COALESCE(SUM(transmission_status='contingency'),0) AS cont FROM dte_headers WHERE DATE(emission_date) = ?", [hoy]);
    res.json({ exito: true, datos: {
      ...datosOperativos,
      ventasHoy: Number(ventas[0].t), dtesHoy: { emitidos: Number(dte[0].ok), rechazados: Number(dte[0].bad), contingencia_pendiente: Number(dte[0].cont) },
    } });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteOcupacion = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let sql = `SELECT r.route_code, COUNT(DISTINCT f.id) AS vuelos, SUM(at.total_capacity) AS capacidad_total, COALESCE(SUM(oc.n),0) AS ocupados
       FROM flights f JOIN routes r ON r.id = f.route_id JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id
       LEFT JOIN (
         SELECT fs.flight_id, COUNT(DISTINCT fs.passenger_id) AS n
         FROM flight_segments fs
         JOIN reservations rx ON rx.id = fs.reservation_id
         WHERE rx.status IN ('pending','confirmed','paid')
         GROUP BY fs.flight_id
       ) oc ON oc.flight_id = f.id
       WHERE 1=1`;
    const params = [];
    if (desde) { sql += ' AND DATE(f.departure_datetime) >= ?'; params.push(desde); }
    if (hasta) { sql += ' AND DATE(f.departure_datetime) <= ?'; params.push(hasta); }
    sql += ' GROUP BY r.id ORDER BY (COALESCE(SUM(oc.n),0)/SUM(at.total_capacity)) DESC';
    const [rows] = await pool.query(sql, params);
    rows.forEach((x) => { x.ocupacion_pct = x.capacidad_total ? Math.round((x.ocupados / x.capacidad_total) * 1000) / 10 : 0; });
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteAncillaries = async (req, res) => {
  try {
    const soloOperativo = req.usuario.rol === 'operations';
    const [rows] = await pool.query(
      `SELECT a.code, a.name, a.type, COUNT(ra.id) AS vendidos${soloOperativo ? '' : ', COALESCE(SUM(ra.price),0) AS ingresos'}
       FROM reservation_ancillaries ra JOIN ancillaries a ON a.id = ra.ancillary_id WHERE ra.status='active'
       GROUP BY a.id ORDER BY ${soloOperativo ? 'vendidos' : 'ingresos'} DESC`);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteCanales = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COALESCE(r.channel,'web') AS canal, COUNT(DISTINCT r.id) AS reservas, COALESCE(SUM(p.amount),0) AS ingresos
       FROM reservations r LEFT JOIN payments p ON p.reservation_id = r.id AND p.status='approved' AND p.type='payment'
       GROUP BY canal ORDER BY ingresos DESC`);
    res.json({ exito: true, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reporteConciliacion = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const [pagos] = await pool.query("SELECT DATE(CONVERT_TZ(payment_date, 'UTC', 'America/El_Salvador')) AS fecha, COALESCE(SUM(amount),0) AS pagos FROM payments WHERE status='approved' AND type='payment' AND (? IS NULL OR DATE(CONVERT_TZ(payment_date, 'UTC', 'America/El_Salvador')) >= ?) AND (? IS NULL OR DATE(CONVERT_TZ(payment_date, 'UTC', 'America/El_Salvador')) <= ?) GROUP BY DATE(CONVERT_TZ(payment_date, 'UTC', 'America/El_Salvador'))", [desde || null, desde || null, hasta || null, hasta || null]);
    const [dtes] = await pool.query("SELECT DATE(emission_date) AS fecha, COALESCE(SUM(total_to_pay),0) AS facturado FROM dte_headers WHERE transmission_status='accepted' AND (? IS NULL OR DATE(emission_date) >= ?) AND (? IS NULL OR DATE(emission_date) <= ?) GROUP BY DATE(emission_date)", [desde || null, desde || null, hasta || null, hasta || null]);
    const mapa = {};
    pagos.forEach((p) => { mapa[p.fecha] = { fecha: p.fecha, pagos: Number(p.pagos), facturado: 0 }; });
    dtes.forEach((d) => { if (!mapa[d.fecha]) mapa[d.fecha] = { fecha: d.fecha, pagos: 0, facturado: 0 }; mapa[d.fecha].facturado = Number(d.facturado); });
    const filas = Object.values(mapa).map((m) => { const dif = Number((m.pagos - m.facturado).toFixed(2)); return Object.assign({}, m, { diferencia: dif, estado: Math.abs(dif) < 0.01 ? 'OK' : 'DISCREPANCIA' }); });
    filas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    res.json({ exito: true, datos: filas });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

module.exports = {
  listarWaitlist, agregarWaitlist, actualizarWaitlist,
  listarAncillaries, crearAncillary, actualizarAncillary, asignarAncillaryVuelo, ancillariesDeVuelo, agregarAncillaryReserva, ancillariesDeReserva,
  reservasParaAncillaries, vuelosDeReservaAncillaries,
  kpi, reporteOcupacion, reporteAncillaries, reporteCanales, reporteConciliacion
};
