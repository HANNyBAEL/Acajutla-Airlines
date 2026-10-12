const centavos = (importe) => Math.round(Number(importe) * 100);

const normalizarImporte = (importe, etiqueta = 'El monto') => {
  const numero = Number(importe);
  if (!Number.isFinite(numero)) throw new Error(`${etiqueta} debe ser un número válido`);
  const totalCentavos = Math.round(numero * 100);
  if (Math.abs(numero * 100 - totalCentavos) > 1e-7) {
    throw new Error(`${etiqueta} debe tener máximo 2 decimales`);
  }
  return totalCentavos / 100;
};

const saldoReembolsable = (importeOriginal, importeReembolsado = 0) =>
  Math.max(0, centavos(importeOriginal) - centavos(importeReembolsado)) / 100;

module.exports = { centavos, normalizarImporte, saldoReembolsable };
