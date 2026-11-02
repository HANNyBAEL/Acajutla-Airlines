export const tipoDocumentoCanonico = (tipo) => {
  const valor = String(tipo || '').trim().toUpperCase();
  if (['13', 'DUI'].includes(valor)) return 'DUI';
  if (['36', 'NIT'].includes(valor)) return 'NIT';
  if (['3', 'PASSPORT', 'PASAPORTE'].includes(valor)) return 'PASAPORTE';
  if (valor === 'CARNET_MENOR') return 'CARNET_MENOR';
  return valor;
};

export const longitudMaximaDocumento = (tipo) => {
  const canonico = tipoDocumentoCanonico(tipo);
  if (canonico === 'DUI') return 10;
  if (canonico === 'NIT') return 14;
  return 20;
};

export const filtrarNumeroDocumento = (valor, tipo) => {
  const canonico = tipoDocumentoCanonico(tipo);
  const maxDigitos = canonico === 'DUI' ? 9 : canonico === 'NIT' ? 14 : 20;
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, maxDigitos);
  return canonico === 'DUI' && digitos.length > 8
    ? `${digitos.slice(0, 8)}-${digitos.slice(8)}`
    : digitos;
};

export const documentoNumericoValido = (valor, tipo) => {
  const canonico = tipoDocumentoCanonico(tipo);
  const texto = String(valor || '').trim();
  if (canonico === 'DUI') return /^(?:\d{9}|\d{8}-\d)$/.test(texto);
  if (canonico === 'NIT') return /^\d{9,14}$/.test(texto);
  return /^\d{5,20}$/.test(texto);
};
