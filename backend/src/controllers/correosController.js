const mailer = require('../services/mailerService');
const pool = require('../config/db');

const listar = async (req, res) => {
  try {
    const rows = await mailer.listar();
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const reenviar = async (req, res) => {
  try {
    const r = await mailer.dispatch(parseInt(req.params.id, 10));
    res.json({ exito: true, datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

const enviarReserva = async (req, res) => {
  try {
    const r = await mailer.enviarConfirmacionReserva(parseInt(req.params.id, 10));
    res.json({ exito: true, datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

const enviarReservaPorCuerpo = async (req, res) => {
  try {
    const reservationId = Number(req.body.reservation_id);
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({ error: 'reservation_id válido es obligatorio' });
    }
    const r = await mailer.enviarConfirmacionReserva(reservationId);
    res.json({ exito: true, datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

const enviarPago = async (req, res) => {
  try {
    const r = await mailer.enviarComprobantePago(parseInt(req.params.id, 10));
    res.json({ exito: true, datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

const enviarPagoPorCuerpo = async (req, res) => {
  try {
    let paymentId = Number(req.body.payment_id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      const reservationId = Number(req.body.reservation_id);
      if (!Number.isInteger(reservationId) || reservationId <= 0) {
        return res.status(400).json({ error: 'payment_id o reservation_id válido es obligatorio' });
      }
      const [pagos] = await pool.query(
        "SELECT id FROM payments WHERE reservation_id = ? AND status = 'approved' AND type = 'payment' ORDER BY id DESC LIMIT 1",
        [reservationId]
      );
      if (!pagos.length) return res.status(404).json({ error: 'No hay un pago aprobado para esta reserva' });
      paymentId = pagos[0].id;
    }
    const r = await mailer.enviarComprobantePago(paymentId);
    res.json({ exito: true, datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

const enviarDte = async (req, res) => {
  try {
    const r = await mailer.enviarDTE(req.params.uuid);
    res.json({ exito: true, datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

module.exports = {
  listar,
  reenviar,
  enviarReserva,
  enviarReservaPorCuerpo,
  enviarPago,
  enviarPagoPorCuerpo,
  enviarDte
};
