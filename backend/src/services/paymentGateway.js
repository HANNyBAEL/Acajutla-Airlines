const crypto = require('crypto');

const TARJETAS_PRUEBA = {
  '4111111111111111': { marca: 'VISA', estado: 'aprobada' },
  '4242424242424242': { marca: 'VISA', estado: 'aprobada' },
  '5555555555554444': { marca: 'MASTERCARD', estado: 'aprobada' },
  '4000000000000002': { marca: 'VISA', estado: 'rechazada', motivo: 'Fondos insuficientes' }
};

class PaymentGateway {
  static async procesarTarjeta(datos) {
    await this.simularLatencia(500, 1500);
    if (!this.validarLuhn(datos.numero_tarjeta)) return { exito: false, codigo: 'INVALID_CARD', mensaje: 'Número de tarjeta inválido' };
    if (!/^\d{3,4}$/.test(datos.cvv)) return { exito: false, codigo: 'INVALID_CVV', mensaje: 'CVV inválido' };
    if (!this.validarExpiracion(datos.expiracion)) return { exito: false, codigo: 'EXPIRED_CARD', mensaje: 'Tarjeta expirada' };

    const tarjetaInfo = TARJETAS_PRUEBA[datos.numero_tarjeta.replace(/\s/g, '')];
    if (!tarjetaInfo) {
      const exitoAleatorio = Math.random() > 0.1;
      if (exitoAleatorio) return this.generarRespuestaAprobada(datos, 'VISA/MASTERCARD');
      return { exito: false, codigo: 'DECLINED', mensaje: 'Transacción declinada' };
    }

    if (tarjetaInfo.estado === 'aprobada') return this.generarRespuestaAprobada(datos, tarjetaInfo.marca);
    return { exito: false, codigo: 'DECLINED', mensaje: tarjetaInfo.motivo || 'Declinada' };
  }

  static async procesarTransferencia(datos) {
    await this.simularLatencia(300, 800);
    return { exito: true, codigo: 'PENDING_CONFIRMATION', mensaje: 'Transferencia registrada, pendiente de confirmación', referencia: datos.referencia };
  }

  static async procesarEfectivo(datos) {
    await this.simularLatencia(100, 300);
    return { exito: true, codigo: 'APPROVED', mensaje: 'Pago en efectivo registrado' };
  }

  static async procesarPayPal(datos) {
    await this.simularLatencia(800, 2000);
    const exito = Math.random() > 0.05;
    if (exito) return { exito: true, codigo: 'APPROVED', paypal_transaction_id: 'PP-' + Date.now() };
    return { exito: false, codigo: 'PAYPAL_DECLINED', mensaje: 'PayPal declinó' };
  }

  static async reembolsar(paymentId, monto, motivo) {
    await this.simularLatencia(500, 1500);
    const exito = Math.random() > 0.05;
    if (exito) return { exito: true, codigo: 'REFUND_APPROVED', refund_id: 'RF-' + Date.now(), monto_reembolsado: monto };
    return { exito: false, codigo: 'REFUND_FAILED', mensaje: 'No se pudo procesar el reembolso' };
  }

  static async confirmarTransferencia(referencia) {
    await this.simularLatencia(200, 500);
    return { exito: true, codigo: 'CONFIRMED', mensaje: 'Transferencia confirmada', referencia };
  }

  static generarRespuestaAprobada(datos, marca) {
    return {
      exito: true, codigo: 'APPROVED', mensaje: 'Transacción aprobada',
      authorization_code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      marca_tarjeta: marca, ultimos_digitos: datos.numero_tarjeta.slice(-4),
      transaction_id: 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase()
    };
  }

  static async simularLatencia(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  static validarLuhn(numero) {
    const digits = numero.replace(/\s/g, '').split('').reverse().map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let digit = digits[i];
      if (i % 2 === 1) { digit *= 2; if (digit > 9) digit -= 9; }
      sum += digit;
    }
    return sum % 10 === 0;
  }

  static validarExpiracion(expiracion) {
    const match = expiracion.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;
    const mes = parseInt(match[1]);
    const anio = parseInt('20' + match[2]);
    if (mes < 1 || mes > 12) return false;
    const ahora = new Date();
    const expira = new Date(anio, mes, 0);
    return expira >= ahora;
  }
}

module.exports = PaymentGateway;