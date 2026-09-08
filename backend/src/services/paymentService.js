const pool = require('../config/db');
const PaymentGateway = require('./paymentGateway');

const procesarPago = async (datos, usuario) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [datos.reservation_id]);
    if (rows.length === 0) throw new Error('Reserva no encontrada');
    const reserva = rows[0];
    if (reserva.status === 'cancelled' || reserva.status === 'completed') throw new Error('La reserva está cancelada o finalizada');

    const pendiente = parseFloat(reserva.estimated_total) - parseFloat(reserva.paid_total || 0);
    const monto = parseFloat(datos.amount || pendiente);
    if (isNaN(monto) || monto <= 0) throw new Error('El monto debe ser mayor a 0');
    if (monto > pendiente + 0.01) throw new Error('El monto excede el saldo pendiente (' + pendiente.toFixed(2) + ')');

    let gateway;
    if (datos.method === 'card') {
      const c = datos.card || {};
      gateway = await PaymentGateway.procesarTarjeta({ numero_tarjeta: c.numero, cvv: c.cvv, expiracion: c.expiracion });
    } else if (datos.method === 'transfer') {
      gateway = await PaymentGateway.procesarTransferencia({ referencia: datos.referencia });
    } else if (datos.method === 'cash') {
      gateway = await PaymentGateway.procesarEfectivo({});
    } else {
      throw new Error('Método de pago no soportado');
    }

    const status = gateway.exito ? (gateway.codigo === 'PENDING_CONFIRMATION' ? 'pending_confirmation' : 'approved') : 'rejected';

    const [r] = await connection.query(
      `INSERT INTO payments (reservation_id, method, amount, currency, status, type, external_reference, authorization_code, card_last_digits, card_brand, gateway_data, reason, processed_by, payment_date)
       VALUES (?, ?, ?, ?, ?, 'payment', ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [reserva.id, datos.method, monto, reserva.currency || 'USD', status,
       gateway.transaction_id || gateway.referencia || null, gateway.authorization_code || null,
       gateway.ultimos_digitos || null, gateway.marca_tarjeta || null, JSON.stringify(gateway),
       datos.referencia || null, usuario && usuario.id ? usuario.id : null]
    );

    if (status === 'approved') {
      const nuevoPagado = parseFloat(reserva.paid_total || 0) + monto;
      const nuevoStatus = (nuevoPagado + 0.01 >= parseFloat(reserva.estimated_total)) ? 'paid' : 'confirmed';
      await connection.query('UPDATE reservations SET paid_total = ?, status = ?, payment_date = NOW() WHERE id = ?', [nuevoPagado, nuevoStatus, reserva.id]);
    } else if (status === 'pending_confirmation') {
      await connection.query('UPDATE reservations SET status = ? WHERE id = ?', ['confirmed', reserva.id]);
    }

    await connection.commit();
    return { payment_id: r.insertId, status: status, amount: monto, reference: gateway.transaction_id || gateway.referencia || null, gateway_message: gateway.mensaje || null };
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
};

const confirmarTransferencia = async (paymentId, usuario) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM payments WHERE id = ? AND status = ? FOR UPDATE', [paymentId, 'pending_confirmation']);
    if (rows.length === 0) throw new Error('Pago pendiente de confirmación no encontrado');
    const pago = rows[0];
    await connection.query('UPDATE payments SET status = ?, confirmed_by = ?, confirmation_date = NOW() WHERE id = ?', ['approved', usuario && usuario.id ? usuario.id : null, paymentId]);
    const [res] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [pago.reservation_id]);
    if (res.length > 0) {
      const reserva = res[0];
      const nuevoPagado = parseFloat(reserva.paid_total || 0) + parseFloat(pago.amount);
      const nuevoStatus = (nuevoPagado + 0.01 >= parseFloat(reserva.estimated_total)) ? 'paid' : 'confirmed';
      await connection.query('UPDATE reservations SET paid_total = ?, status = ?, payment_date = NOW() WHERE id = ?', [nuevoPagado, nuevoStatus, reserva.id]);
    }
    await connection.commit();
    return { payment_id: paymentId, status: 'approved' };
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
};

const reembolsar = async (paymentId, monto, reason, usuario) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM payments WHERE id = ? AND status = ? AND type = ? FOR UPDATE', [paymentId, 'approved', 'payment']);
    if (rows.length === 0) throw new Error('Pago aprobado no encontrado');
    const pago = rows[0];
    const montoRef = parseFloat(monto || pago.amount);
    if (montoRef <= 0 || montoRef > parseFloat(pago.amount)) throw new Error('Monto de reembolso inválido');
    const gateway = await PaymentGateway.reembolsar(pago.external_reference, montoRef, reason);
    if (!gateway.exito) throw new Error(gateway.mensaje || 'La pasarela rechazó el reembolso');
    await connection.query(
      `INSERT INTO payments (reservation_id, original_payment_id, method, amount, currency, status, type, external_reference, reason, processed_by, payment_date)
       VALUES (?, ?, ?, ?, ?, 'refunded', 'refund', ?, ?, ?, NOW())`,
      [pago.reservation_id, paymentId, pago.method, montoRef, pago.currency, gateway.refund_id, reason, usuario && usuario.id ? usuario.id : null]
    );
    const [res] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [pago.reservation_id]);
    if (res.length > 0) {
      const reserva = res[0];
      const nuevoPagado = Math.max(0, parseFloat(reserva.paid_total || 0) - montoRef);
      const nuevoStatus = (nuevoPagado + 0.01 >= parseFloat(reserva.estimated_total)) ? 'paid' : (nuevoPagado > 0 ? 'confirmed' : 'pending');
      await connection.query('UPDATE reservations SET paid_total = ?, status = ? WHERE id = ?', [nuevoPagado, nuevoStatus, reserva.id]);
    }
    await connection.commit();
    return { refund_id: gateway.refund_id, amount: montoRef };
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    connection.release();
  }
};

module.exports = { procesarPago: procesarPago, confirmarTransferencia: confirmarTransferencia, reembolsar: reembolsar };