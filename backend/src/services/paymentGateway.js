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
      return { exito: false, codigo: 'TEST_CARD_REQUIRED', mensaje: 'Simulación escolar: utiliza una tarjeta de prueba del catálogo' };
    }

    if (tarjetaInfo.estado === 'aprobada') return this.generarRespuestaAprobada(datos, tarjetaInfo.marca);
    return { exito: false, codigo: 'DECLINED', mensaje: tarjetaInfo.motivo || 'Declinada' };
  }

  static async procesarTransferencia(datos) {
    if (typeof datos.referencia !== 'string' || !datos.referencia.trim() || datos.referencia.trim().length > 100) throw new Error('Referencia de transferencia obligatoria (máximo 100 caracteres)');
    await this.simularLatencia(300, 800);
    return { exito: true, codigo: 'PENDING_CONFIRMATION', mensaje: 'Transferencia registrada, pendiente de confirmación', referencia: datos.referencia };
  }

  static async procesarEfectivo(datos) {
    await this.simularLatencia(100, 300);
    return { exito: true, codigo: 'APPROVED', mensaje: 'Pago en efectivo registrado' };
  }

  static async procesarPayPal(datos) {
    await this.simularLatencia(800, 2000);
    const exito = true; // Simulación determinista, sin proveedor externo.
    if (exito) {
      const transactionId = 'PP-' + crypto.randomUUID().toUpperCase();
      return { exito: true, codigo: 'APPROVED', transaction_id: transactionId, paypal_transaction_id: transactionId };
    }
    return { exito: false, codigo: 'PAYPAL_DECLINED', mensaje: 'PayPal declinó' };
  }

  static async reembolsar(paymentId, monto, motivo) {
    await this.simularLatencia(500, 1500);
    const exito = true; // Reembolso exclusivamente simulado.
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
    if (typeof numero !== 'string' || !/^\d{13,19}$/.test(numero.replace(/\s/g, ''))) return false;
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
    if (typeof expiracion !== 'string') return false;
    const match = expiracion.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;
    const mes = parseInt(match[1]);
    const anio = parseInt('20' + match[2]);
    if (mes < 1 || mes > 12) return false;
    const ahora = new Date();
    const expira = new Date(anio, mes, 1);
    return ahora < expira;
  }
}

module.exports = PaymentGateway;
