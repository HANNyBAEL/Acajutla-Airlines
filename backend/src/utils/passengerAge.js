const { fechaElSalvador } = require('./fechaElSalvador');

// Fechas civiles: no convertir el nacimiento a medianoche UTC/local.
const edadEnFecha = (birth, reference = fechaElSalvador()) => {
  const text = String(birth || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || text > reference) return null;
  const [ry, rm, rd] = reference.split('-').map(Number);
  return ry - year - (rm < month || (rm === month && rd < day) ? 1 : 0);
};

const tipoPorNacimiento = (birth, reference) => {
  const age = edadEnFecha(birth, reference);
  return age === null ? null : age < 2 ? 'infant' : age < 12 ? 'child' : 'adult';
};

module.exports = { edadEnFecha, tipoPorNacimiento };
