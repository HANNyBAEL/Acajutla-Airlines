// El catálogo comercial usa códigos configurables (p. ej. ECONOMICA), mientras
// flight_segments conserva el catálogo técnico ENUM. Centralizar el mapeo evita
// que un código comercial se intente guardar directamente en ese ENUM.
const CLASES = {
  economy: { fareCode: 'ECONOMICA', segmentCode: 'economy' },
  economica: { fareCode: 'ECONOMICA', segmentCode: 'economy' },
  premium: { fareCode: 'PREMIUM', segmentCode: 'premium' },
  business: { fareCode: 'BUSINESS', segmentCode: 'business' },
  ejecutiva: { fareCode: 'BUSINESS', segmentCode: 'business' },
  first: { fareCode: 'PRIMERA', segmentCode: 'first' },
  primera: { fareCode: 'PRIMERA', segmentCode: 'first' }
};

const resolverClase = (clase = 'economy') => {
  const normalizada = String(clase).trim().toLowerCase();
  return CLASES[normalizada] || { fareCode: String(clase).trim().toUpperCase(), segmentCode: normalizada };
};

module.exports = { resolverClase };
