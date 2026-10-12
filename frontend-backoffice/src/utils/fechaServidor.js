const ZONA_HORARIA_SV = 'America/El_Salvador';
const FORMATO_FECHA_SV = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA_SV, year: 'numeric', month: '2-digit', day: '2-digit'
});

export function parsearFechaUtcDb(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  const texto = String(valor).trim();
  const normalizado = texto.includes('T') ? texto : texto.replace(' ', 'T');
  const tieneZona = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalizado);
  const fecha = new Date(tieneZona ? normalizado : normalizado + 'Z');
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearFechaHoraDb(valor) {
  const fecha = parsearFechaUtcDb(valor);
  return fecha ? fecha.toLocaleString('es-SV', { timeZone: ZONA_HORARIA_SV }) : '—';
}

export function formatearFechaDb(valor) {
  const fecha = parsearFechaUtcDb(valor);
  return fecha ? fecha.toLocaleDateString('es-SV', { timeZone: ZONA_HORARIA_SV }) : '—';
}

export function inicioDiaSV(fecha) {
  return new Date(fecha + 'T00:00:00-06:00');
}

export function finDiaSV(fecha) {
  return new Date(fecha + 'T23:59:59.999-06:00');
}

export function fechaActualSV() {
  const partes = Object.fromEntries(FORMATO_FECHA_SV.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}
