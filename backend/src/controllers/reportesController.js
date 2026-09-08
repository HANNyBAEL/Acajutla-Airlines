const pool = require('../config/db');

const fmtFecha = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toISOString().slice(0, 10);
};

const rango = (query) => {
  const hasta = query.hasta || fmtFecha(new Date());
  const desde = query.desde || fmtFecha(new Date(Date.now() - 30 * 24 * 3600 * 1000));
  return { desde: desde, hasta: hasta };
};

const dashboard = async (req, res) => {
  try {
    const [vuelosHoy] = await pool.query(
      "SELECT status, COUNT(*) AS total FROM flights WHERE DATE(departure_datetime) = CURDATE() GROUP BY status"
    );
    const [pax24] = await pool.query(
      "SELECT COUNT(*) AS total FROM passengers p JOIN reservations r ON r.id = p.reservation_id WHERE r.created_at >= (NOW() - INTERVAL 24 HOUR)"
    );
    const [ocup] = await pool.query(
      "SELECT ROUND(AVG(t.ocupacion), 2) AS promedio FROM (SELECT (SELECT COUNT(*) FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id WHERE fs.flight_id = f.id AND r.status IN ('paid','confirmed')) / at.total_capacity * 100 AS ocupacion FROM flights f JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id WHERE DATE(f.departure_datetime) = CURDATE()) t"
    );
    const [mant] = await pool.query(
      "SELECT COUNT(*) AS total FROM aircraft WHERE status IN ('maintenance','out_of_service')"
    );
    const [ventasPorCanal] = await pool.query(
      "SELECT r.sales_channel AS canal, COALESCE(SUM(p.amount),0) AS monto FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE p.status = 'approved' AND p.type = 'payment' AND DATE(p.payment_date) = CURDATE() GROUP BY r.sales_channel ORDER BY monto DESC"
    );
    const [ventasTotal] = await pool.query(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'approved' AND type = 'payment' AND DATE(payment_date) = CURDATE()"
    );
    const [dte] = await pool.query(
      "SELECT COALESCE(SUM(transmission_status='accepted'),0) AS aceptados, COALESCE(SUM(transmission_status='rejected'),0) AS rechazados, COALESCE(SUM(transmission_status='transmitted'),0) AS pendientes, COALESCE(SUM(transmission_status='contingency'),0) AS contingencia FROM dte_headers WHERE DATE(emission_date) = CURDATE()"
    );
    const [cont24] = await pool.query(
      "SELECT COUNT(*) AS total FROM dte_headers WHERE transmission_status IN ('contingency','transmitted') AND emission_date < (NOW() - INTERVAL 24 HOUR)"
    );
    const [reb] = await pool.query(
      "SELECT COALESCE(SUM(status='refunded'),0) AS procesados, COUNT(*) AS solicitados FROM payments WHERE type = 'refund'"
    );
    res.json({
      exito: true,
      datos: {
        vuelosHoy: vuelosHoy,
        pax24: pax24[0].total,
        ocupacionPromedio: ocup[0].promedio || 0,
        alertasMantenimiento: mant[0].total,
        ventasPorCanal: ventasPorCanal,
        ventasTotal: ventasTotal[0].total,
        dte: dte[0],
        contingenciaPendiente24h: cont24[0].total,
        reembolsos: reb[0]
      }
    });
  } catch (e) {
    console.error('Error dashboard:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const ingresos = async (req, res) => {
  try {
    const { desde, hasta } = rango(req.query);
    const [serie] = await pool.query(
      "SELECT DATE(p.payment_date) AS fecha, SUM(CASE WHEN p.type = 'payment' THEN p.amount ELSE 0 END) AS bruto, SUM(CASE WHEN p.type = 'refund' THEN p.amount ELSE 0 END) AS reembolsos, SUM(CASE WHEN p.type = 'payment' THEN p.amount ELSE -p.amount END) AS neto FROM payments p WHERE p.status IN ('approved','refunded') AND DATE(p.payment_date) BETWEEN ? AND ? GROUP BY DATE(p.payment_date) ORDER BY fecha",
      [desde, hasta]
    );
    const [porCanal] = await pool.query(
      "SELECT r.sales_channel AS canal, COALESCE(SUM(p.amount),0) AS monto, COUNT(*) AS operaciones FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE p.status = 'approved' AND p.type = 'payment' AND DATE(p.payment_date) BETWEEN ? AND ? GROUP BY r.sales_channel ORDER BY monto DESC",
      [desde, hasta]
    );
    const [porMetodo] = await pool.query(
      "SELECT p.method, COALESCE(SUM(p.amount),0) AS monto, COUNT(*) AS operaciones FROM payments p WHERE p.status = 'approved' AND p.type = 'payment' AND DATE(p.payment_date) BETWEEN ? AND ? GROUP BY p.method ORDER BY monto DESC",
      [desde, hasta]
    );
    const [totales] = await pool.query(
      "SELECT COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END),0) AS bruto, COALESCE(SUM(CASE WHEN type = 'refund' THEN amount ELSE 0 END),0) AS reembolsos FROM payments WHERE status IN ('approved','refunded') AND DATE(payment_date) BETWEEN ? AND ?",
      [desde, hasta]
    );
    const serieFmt = serie.map((s) => ({ fecha: fmtFecha(s.fecha), bruto: Number(s.bruto), reembolsos: Number(s.reembolsos), neto: Number(s.neto) }));
    res.json({ exito: true, datos: { desde: desde, hasta: hasta, serie: serieFmt, porCanal: porCanal, porMetodo: porMetodo, totales: totales[0] } });
  } catch (e) {
    console.error('Error ingresos:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const ocupacion = async (req, res) => {
  try {
    const { desde, hasta } = rango(req.query);
    const [vuelos] = await pool.query(
      "SELECT f.id, ao.iata_code AS origen, ad.iata_code AS destino, at.total_capacity FROM flights f JOIN routes rt ON rt.id = f.route_id JOIN airports ao ON ao.id = rt.origin_id JOIN airports ad ON ad.id = rt.destination_id JOIN aircraft ac ON ac.id = f.aircraft_id JOIN aircraft_types at ON at.id = ac.type_id WHERE DATE(f.departure_datetime) BETWEEN ? AND ?",
      [desde, hasta]
    );
    const vendidosMap = {};
    if (vuelos.length) {
      const ids = vuelos.map((v) => v.id);
      const [segs] = await pool.query(
        "SELECT fs.flight_id, COUNT(*) AS n FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id WHERE r.status IN ('paid','confirmed') AND fs.flight_id IN (?) GROUP BY fs.flight_id",
        [ids]
      );
      segs.forEach((s) => { vendidosMap[s.flight_id] = Number(s.n); });
    }
    const porRuta = {};
    vuelos.forEach((v) => {
      const k = v.origen + '-' + v.destino;
      if (!porRuta[k]) porRuta[k] = { ruta: k, origen: v.origen, destino: v.destino, vuelos: 0, capacidad: 0, vendidos: 0 };
      porRuta[k].vuelos += 1;
      porRuta[k].capacidad += Number(v.total_capacity);
      porRuta[k].vendidos += vendidosMap[v.id] || 0;
    });
    const datos = Object.values(porRuta).map((r) => Object.assign({}, r, { ocupacion: r.capacidad > 0 ? Math.round((r.vendidos / r.capacidad) * 10000) / 100 : 0 }));
    datos.sort((a, b) => b.ocupacion - a.ocupacion);
    res.json({ exito: true, datos: datos });
  } catch (e) {
    console.error('Error ocupacion:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const conciliacion = async (req, res) => {
  try {
    const { desde, hasta } = rango(req.query);
    const [pagos] = await pool.query(
      "SELECT DATE(p.payment_date) AS fecha, COALESCE(SUM(p.amount),0) AS pagos FROM payments p WHERE p.status = 'approved' AND p.type = 'payment' AND DATE(p.payment_date) BETWEEN ? AND ? GROUP BY DATE(p.payment_date)",
      [desde, hasta]
    );
    const [dtes] = await pool.query(
      "SELECT DATE(emission_date) AS fecha, COALESCE(SUM(total_to_pay),0) AS facturado FROM dte_headers WHERE transmission_status = 'accepted' AND DATE(emission_date) BETWEEN ? AND ? GROUP BY DATE(emission_date)",
      [desde, hasta]
    );
    const mapa = {};
    pagos.forEach((p) => { const f = fmtFecha(p.fecha); mapa[f] = { fecha: f, pagos: Number(p.pagos), facturado: 0 }; });
    dtes.forEach((d) => { const f = fmtFecha(d.fecha); if (!mapa[f]) mapa[f] = { fecha: f, pagos: 0, facturado: 0 }; mapa[f].facturado = Number(d.facturado); });
    const filas = Object.values(mapa).map((m) => {
      const dif = Number((m.pagos - m.facturado).toFixed(2));
      return { fecha: m.fecha, pagos: m.pagos, facturado: m.facturado, diferencia: dif, estado: Math.abs(dif) < 0.01 ? 'OK' : 'DISCREPANCIA' };
    });
    filas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    res.json({ exito: true, datos: filas });
  } catch (e) {
    console.error('Error conciliacion:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

const dteResumen = async (req, res) => {
  try {
    const [porTipo] = await pool.query(
      "SELECT dte_type, transmission_status, COUNT(*) AS total, COALESCE(SUM(total_to_pay),0) AS monto FROM dte_headers GROUP BY dte_type, transmission_status ORDER BY dte_type, transmission_status"
    );
    const [bitacora] = await pool.query(
      "SELECT id, uuid_generation, dte_type, control_number, emission_date, transmission_status, reception_seal, total_to_pay, reservation_id FROM dte_headers ORDER BY id DESC LIMIT 100"
    );
    res.json({ exito: true, datos: { porTipo: porTipo, bitacora: bitacora } });
  } catch (e) {
    console.error('Error dte resumen:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { dashboard: dashboard, ingresos: ingresos, ocupacion: ocupacion, conciliacion: conciliacion, dteResumen: dteResumen };