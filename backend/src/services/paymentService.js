const pool = require('../config/db');
const PaymentGateway = require('./paymentGateway');
const { centavos, normalizarImporte, saldoReembolsable: calcularSaldoReembolsable } = require('../utils/money');

const procesarPago = async (datos, usuario) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [datos.reservation_id]);
    if (rows.length === 0) throw new Error('Reserva no encontrada');
    const reserva = rows[0];
    if (reserva.status === 'cancelled' || reserva.status === 'expired' || reserva.status === 'completed') throw new Error('La reserva está cancelada, expirada o finalizada');
    if (['pending', 'confirmed'].includes(reserva.status) && reserva.time_limit) {
      const [limite] = await connection.query('SELECT time_limit < NOW() AS vencida FROM reservations WHERE id = ?', [reserva.id]);
      if (Number(limite[0]?.vencida) === 1) {
        throw new Error('La reserva venció (time limit). Debe crearse una nueva reserva.');
      }
    }

    const [pendientesTransferencia] = await connection.query(
      "SELECT COALESCE(SUM(amount), 0) AS amount FROM payments WHERE reservation_id = ? AND type = 'payment' AND status = 'pending_confirmation' AND method = 'transfer' AND external_reference IS NOT NULL",
      [reserva.id]
    );
    const totalCentavos = centavos(reserva.estimated_total);
    const pagadoCentavos = centavos(reserva.paid_total || 0);
    const pendienteCentavos = totalCentavos - pagadoCentavos - centavos(pendientesTransferencia[0]?.amount || 0);
    if (pendienteCentavos <= 0) throw new Error('La reserva ya está pagada o tiene transferencias pendientes por el saldo completo');
    const monto = normalizarImporte(datos.amount ?? pendienteCentavos / 100);
    const montoCentavos = centavos(monto);
    if (montoCentavos <= 0) throw new Error('El monto debe ser mayor a 0');
    if (montoCentavos > pendienteCentavos) throw new Error('El monto supera el saldo disponible, descontando pagos pendientes de confirmación');

    let gateway;
    if (datos.method === 'card') {
      const c = datos.card || {};
      gateway = await PaymentGateway.procesarTarjeta({ numero_tarjeta: c.numero, cvv: c.cvv, expiracion: c.expiracion });
    } else if (datos.method === 'transfer') {
      gateway = await PaymentGateway.procesarTransferencia({ referencia: datos.referencia });
    } else if (datos.method === 'paypal') {
      gateway = await PaymentGateway.procesarPayPal({});
    } else if (datos.method === 'cash') {
      gateway = await PaymentGateway.procesarEfectivo({});
    } else {
      throw new Error('Método de pago no soportado');
    }

    const status = gateway.exito ? (gateway.codigo === 'PENDING_CONFIRMATION' ? 'pending_confirmation' : 'approved') : 'rejected';

    const gatewayData = {
      ...gateway,
      ...(datos.paymentMetadata && typeof datos.paymentMetadata === 'object' ? datos.paymentMetadata : {})
    };
    const referenciaGateway = gateway.transaction_id || gateway.paypal_transaction_id || gateway.referencia || null;
    const [r] = await connection.query(
      `INSERT INTO payments (reservation_id, method, amount, currency, status, type, external_reference, authorization_code, card_last_digits, card_brand, gateway_data, reason, processed_by, requiere_deduccion_fiscal, receptor_dte, payment_date)
       VALUES (?, ?, ?, ?, ?, 'payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [reserva.id, datos.method, monto, reserva.currency || 'USD', status,
       referenciaGateway, gateway.authorization_code || null,
       gateway.ultimos_digitos || null, gateway.marca_tarjeta || null, JSON.stringify(gatewayData),
       datos.referencia || null, usuario && usuario.id ? usuario.id : null, datos.requiereDeduccionFiscal ? 1 : 0,
       datos.receptorDte ? JSON.stringify(datos.receptorDte) : null]
    );

    let reservationStatus = reserva.status;
    let reservationBalance = Math.max(0, totalCentavos - pagadoCentavos) / 100;
    if (status === 'approved') {
      const nuevoPagadoCentavos = pagadoCentavos + montoCentavos;
      const nuevoPagado = nuevoPagadoCentavos / 100;
      const nuevoStatus = nuevoPagadoCentavos >= totalCentavos ? 'paid' : 'confirmed';
      await connection.query('UPDATE reservations SET paid_total = ?, status = ?, payment_date = NOW() WHERE id = ?', [nuevoPagado, nuevoStatus, reserva.id]);
      reservationStatus = nuevoStatus;
      reservationBalance = Math.max(0, totalCentavos - nuevoPagadoCentavos) / 100;
    }
    // Un pago pending_confirmation (transferencia sin confirmar) NO cambia el
    // estado de la reserva: los fondos aún no fueron recibidos. La reserva se
    // confirma recién en confirmarTransferencia.

    await connection.commit();
    return {
      payment_id: r.insertId, status, amount: monto,
      reservation_status: reservationStatus, reservation_balance: reservationBalance,
      reference: gateway.transaction_id || gateway.referencia || null,
      gateway_message: gateway.mensaje || null
    };
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
    // Mantener el orden de bloqueo reserva -> pago, igual que en procesarPago.
    const [candidatos] = await connection.query("SELECT reservation_id FROM payments WHERE id = ? AND status = ? AND type = ? AND method = 'transfer' AND external_reference IS NOT NULL", [paymentId, 'pending_confirmation', 'payment']);
    if (candidatos.length === 0) throw new Error('Pago pendiente de confirmación no encontrado');
    const [res] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [candidatos[0].reservation_id]);
    if (res.length === 0) throw new Error('Reserva asociada al pago no encontrada');
    const [rows] = await connection.query("SELECT * FROM payments WHERE id = ? AND status = ? AND type = ? AND method = 'transfer' AND external_reference IS NOT NULL FOR UPDATE", [paymentId, 'pending_confirmation', 'payment']);
    if (rows.length === 0) throw new Error('Pago pendiente de confirmación no encontrado');
    const pago = rows[0];
    const reserva = res[0];
    if (['pending', 'confirmed'].includes(reserva.status) && reserva.time_limit) {
      const [limite] = await connection.query('SELECT time_limit < NOW() AS vencida FROM reservations WHERE id = ?', [reserva.id]);
      if (Number(limite[0]?.vencida) === 1) throw new Error('La reserva venció; no se puede confirmar el pago');
    }
    if (reserva.status === 'cancelled' || reserva.status === 'expired' || reserva.status === 'completed') {
      throw new Error('La reserva está ' + (reserva.status === 'expired' ? 'expirada' : reserva.status === 'cancelled' ? 'cancelada' : 'finalizada') + '. No se puede confirmar el pago.');
    }
    const totalCentavos = centavos(reserva.estimated_total);
    const pagadoCentavos = centavos(reserva.paid_total || 0);
    const montoPagoCentavos = centavos(pago.amount);
    const saldoCentavos = totalCentavos - pagadoCentavos;
    if (montoPagoCentavos > saldoCentavos) throw new Error('El pago excede el saldo pendiente de la reserva');
    await connection.query('UPDATE payments SET status = ?, confirmed_by = ?, confirmation_date = NOW() WHERE id = ?', ['approved', usuario && usuario.id ? usuario.id : null, paymentId]);
    const nuevoPagadoCentavos = pagadoCentavos + montoPagoCentavos;
    const nuevoPagado = nuevoPagadoCentavos / 100;
    const nuevoStatus = nuevoPagadoCentavos >= totalCentavos ? 'paid' : 'confirmed';
    await connection.query('UPDATE reservations SET paid_total = ?, status = ?, payment_date = NOW() WHERE id = ?', [nuevoPagado, nuevoStatus, reserva.id]);
    await connection.commit();
    return {
      payment_id: paymentId, status: 'approved', reservation_status: nuevoStatus,
      reservation_balance: Math.max(0, totalCentavos - nuevoPagadoCentavos) / 100
    };
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
    // Bloquear en el mismo orden que procesarPago/confirmarTransferencia.
    const [candidatos] = await connection.query('SELECT reservation_id FROM payments WHERE id = ? AND status = ? AND type = ?', [paymentId, 'approved', 'payment']);
    if (candidatos.length === 0) throw new Error('Pago aprobado no encontrado');
    const [res] = await connection.query('SELECT * FROM reservations WHERE id = ? FOR UPDATE', [candidatos[0].reservation_id]);
    if (res.length === 0) throw new Error('Reserva asociada al pago no encontrada');
    const [rows] = await connection.query('SELECT * FROM payments WHERE id = ? AND status = ? AND type = ? FOR UPDATE', [paymentId, 'approved', 'payment']);
    if (rows.length === 0) throw new Error('Pago aprobado no encontrado');
    const pago = rows[0];
    const montoRef = normalizarImporte(monto ?? pago.amount, 'El monto del reembolso');
    const montoRefCentavos = centavos(montoRef);
    const [reembolsosPrevios] = await connection.query(
      "SELECT COALESCE(SUM(amount), 0) AS amount FROM payments WHERE original_payment_id = ? AND type = 'refund' AND status = 'refunded'",
      [paymentId]
    );
    const reembolsado = parseFloat(reembolsosPrevios[0]?.amount || 0);
    const saldoDisponible = calcularSaldoReembolsable(pago.amount, reembolsado);
    if (montoRefCentavos <= 0 || montoRefCentavos > centavos(saldoDisponible)) {
      throw new Error('Monto de reembolso inválido; el saldo reembolsable del pago es $' + saldoDisponible.toFixed(2));
    }
    const gateway = await PaymentGateway.reembolsar(pago.external_reference, montoRef, reason);
    if (!gateway.exito) throw new Error(gateway.mensaje || 'La pasarela rechazó el reembolso');
    await connection.query(
      `INSERT INTO payments (reservation_id, original_payment_id, method, amount, currency, status, type, external_reference, reason, processed_by, payment_date)
       VALUES (?, ?, ?, ?, ?, 'refunded', 'refund', ?, ?, ?, NOW())`,
      [pago.reservation_id, paymentId, pago.method, montoRef, pago.currency, gateway.refund_id, reason, usuario && usuario.id ? usuario.id : null]
    );
    const reserva = res[0];
    const nuevoPagadoCentavos = Math.max(0, centavos(reserva.paid_total || 0) - montoRefCentavos);
    const nuevoPagado = nuevoPagadoCentavos / 100;
    const nuevoStatus = (nuevoPagadoCentavos >= centavos(reserva.estimated_total)) ? 'paid' : (nuevoPagadoCentavos > 0 ? 'confirmed' : 'pending');
    // Un reembolso no debe revivir reservas canceladas, expiradas o completadas.
    const estadoTerminal = ['cancelled', 'expired', 'completed'].includes(reserva.status);
    if (estadoTerminal) {
      await connection.query('UPDATE reservations SET paid_total = ? WHERE id = ?', [nuevoPagado, reserva.id]);
    } else if (nuevoStatus === 'pending') {
      // Si vuelve a pendiente, renueva el límite para que no expire de inmediato.
      await connection.query(
        'UPDATE reservations SET paid_total = ?, status = ?, time_limit = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?',
        [nuevoPagado, nuevoStatus, reserva.id]
      );
    } else {
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
