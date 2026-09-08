const pool = require('../config/db');
const PaymentGateway = require('./paymentGateway');
const { enviarCorreo } = require('../config/brevo');

class PaymentService {
  static async procesarPago(datos, usuario) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [reservas] = await connection.query(`SELECT r.*, c.email AS customer_email, c.first_names AS customer_first_names FROM reservations r LEFT JOIN customers c ON r.customer_id = c.id WHERE r.id = ? FOR UPDATE`, [datos.reservation_id]);
      if (reservas.length === 0) throw new Error('Reserva no encontrada');
      const reserva = reservas[0];
      if (!['pending', 'confirmed'].includes(reserva.status)) throw new Error(`No se puede pagar una reserva en estado: ${reserva.status}`);
      if (reserva.status === 'pending' && new Date(reserva.time_limit) < new Date()) throw new Error('La reserva ha expirado');

      const montoEsperado = parseFloat(reserva.estimated_total);
      const montoPago = parseFloat(datos.monto || montoEsperado);
      if (Math.abs(montoPago - montoEsperado) > 0.01) throw new Error(`Monto incorrecto. Esperado: ${montoEsperado}, recibido: ${montoPago}`);

      let respuestaPasarela;
      switch (datos.metodo) {
        case 'card': respuestaPasarela = await PaymentGateway.procesarTarjeta(datos.datos_pago); break;
        case 'transfer': respuestaPasarela = await PaymentGateway.procesarTransferencia(datos.datos_pago); break;
        case 'cash': respuestaPasarela = await PaymentGateway.procesarEfectivo({ ...datos.datos_pago, cajero: usuario.nombre }); break;
        case 'paypal': respuestaPasarela = await PaymentGateway.procesarPayPal(datos.datos_pago); break;
        default: throw new Error(`Método de pago no soportado: ${datos.metodo}`);
      }

      let estadoPago;
      if (respuestaPasarela.exito) {
        estadoPago = respuestaPasarela.codigo === 'PENDING_CONFIRMATION' ? 'pending_confirmation' : 'approved';
      } else {
        estadoPago = 'rejected';
      }

      const [resultPago] = await connection.query(
        `INSERT INTO payments (reservation_id, method, amount, currency, status, external_reference, authorization_code, card_last_digits, card_brand, gateway_data, processed_by, payment_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [reserva.id, datos.metodo, montoPago, reserva.currency || 'USD', estadoPago, respuestaPasarela.transaction_id || respuestaPasarela.referencia, respuestaPasarela.authorization_code, respuestaPasarela.ultimos_digitos, respuestaPasarela.marca_tarjeta, JSON.stringify(respuestaPasarela), usuario.id]
      );

      if (estadoPago === 'approved') {
        await connection.query(`UPDATE reservations SET status = 'paid', paid_total = paid_total + ?, payment_date = NOW() WHERE id = ?`, [montoPago, reserva.id]);
      } else if (estadoPago === 'pending_confirmation') {
        await connection.query(`UPDATE reservations SET status = 'confirmed' WHERE id = ?`, [reserva.id]);
      }

      await connection.commit();
      return { payment_id: resultPago.insertId, status: estadoPago, amount: montoPago, reference: respuestaPasarela.transaction_id || respuestaPasarela.referencia, gateway_response: respuestaPasarela };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async confirmarTransferencia(paymentId, usuario) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [pagos] = await connection.query(`SELECT p.*, r.estimated_total FROM payments p JOIN reservations r ON p.reservation_id = r.id WHERE p.id = ? AND p.status = 'pending_confirmation' FOR UPDATE`, [paymentId]);
      if (pagos.length === 0) throw new Error('Pago pendiente no encontrado');
      const pago = pagos[0];
      const respuesta = await PaymentGateway.confirmarTransferencia(pago.external_reference);
      if (!respuesta.exito) throw new Error('No se pudo confirmar');
      await connection.query(`UPDATE payments SET status = 'approved', confirmed_by = ?, confirmation_date = NOW() WHERE id = ?`, [usuario.id, paymentId]);
      await connection.query(`UPDATE reservations SET status = 'paid', paid_total = paid_total + ?, payment_date = NOW() WHERE id = ?`, [pago.amount, pago.reservation_id]);
      await connection.commit();
      return { exito: true, mensaje: 'Transferencia confirmada' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async reembolsar(paymentId, montoReembolso, motivo, usuario) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [pagos] = await connection.query(`SELECT p.*, r.pnr FROM payments p JOIN reservations r ON p.reservation_id = r.id WHERE p.id = ? AND p.status = 'approved' FOR UPDATE`, [paymentId]);
      if (pagos.length === 0) throw new Error('Pago aprobado no encontrado');
      const pago = pagos[0];
      
      // Calcular total reembolsado previamente para este pago original
      const [reembolsosPrevios] = await connection.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_reembolsado 
         FROM payments 
         WHERE original_payment_id = ? AND type = 'refund' AND status = 'approved'`,
        [paymentId]
      );
      const totalReembolsado = parseFloat(reembolsosPrevios[0].total_reembolsado);
      const montoDisponible = pago.amount - totalReembolsado;
      
      if (montoReembolso > montoDisponible) {
        throw new Error(`Monto de reembolso excede lo disponible. Pago original: ${pago.amount}, Reembolsado previamente: ${totalReembolsado}, Disponible: ${montoDisponible}`);
      }
      
      const respuesta = await PaymentGateway.reembolsar(pago.external_reference, montoReembolso, motivo);
      if (!respuesta.exito) throw new Error('No se pudo procesar el reembolso');
      await connection.query(`INSERT INTO payments (reservation_id, original_payment_id, method, amount, currency, status, type, external_reference, reason, processed_by, payment_date) VALUES (?, ?, ?, ?, ?, 'approved', 'refund', ?, ?, ?, NOW())`, [pago.reservation_id, paymentId, pago.method, montoReembolso, pago.currency, respuesta.refund_id, motivo, usuario.id]);
      await connection.query(`UPDATE reservations SET paid_total = paid_total - ? WHERE id = ?`, [montoReembolso, pago.reservation_id]);
      await connection.commit();
      return { exito: true, refund_id: respuesta.refund_id, amount: montoReembolso, monto_disponible_previo: montoDisponible };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = PaymentService;