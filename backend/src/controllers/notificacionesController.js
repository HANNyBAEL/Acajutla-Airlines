const pool = require('../config/db');

const listar = async (req, res) => {
  try {
    const notas = [];
    const [pend] = await pool.query(
      "SELECT r.id, r.pnr, r.time_limit, c.first_names, c.last_names FROM reservations r LEFT JOIN customers c ON c.id = r.customer_id WHERE r.status IN ('pending','confirmed') AND r.time_limit IS NOT NULL AND r.time_limit > NOW() ORDER BY r.time_limit ASC LIMIT 10"
    );
    pend.forEach((r) => notas.push({ id: 'res-' + r.id, tipo: 'reserva', titulo: 'Reserva ' + r.pnr + ' por vencer', detalle: ((r.first_names || '') + ' ' + (r.last_names || '')).trim() + ' · vence ' + new Date(r.time_limit).toLocaleString('es-SV'), fecha: r.time_limit, leida: false }));

    const [rech] = await pool.query("SELECT id, control_number, dte_type FROM dte_headers WHERE transmission_status = 'rejected' ORDER BY id DESC LIMIT 10");
    rech.forEach((d) => notas.push({ id: 'dte-' + d.id, tipo: 'dte', titulo: 'DTE rechazado ' + d.control_number, detalle: 'Tipo ' + d.dte_type + ' · requiere corrección y reemisión', fecha: null, leida: false }));

    const [cont] = await pool.query("SELECT id, control_number FROM dte_headers WHERE transmission_status = 'contingency' ORDER BY id DESC LIMIT 10");
    cont.forEach((d) => notas.push({ id: 'cont-' + d.id, tipo: 'contingencia', titulo: 'DTE en contingencia ' + d.control_number, detalle: 'Pendiente de transmitir evento (plazo 24 h)', fecha: null, leida: false }));

    const [pag] = await pool.query("SELECT p.id, p.amount, r.pnr FROM payments p JOIN reservations r ON r.id = p.reservation_id WHERE p.status = 'pending_confirmation' ORDER BY p.id DESC LIMIT 10");
    pag.forEach((p) => notas.push({ id: 'pago-' + p.id, tipo: 'pago', titulo: 'Transferencia por confirmar ' + p.pnr, detalle: '$' + Number(p.amount).toFixed(2), fecha: null, leida: false }));

    res.json({ exito: true, total: notas.length, datos: notas });
  } catch (e) {
    console.error('Error notificaciones:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listar: listar };