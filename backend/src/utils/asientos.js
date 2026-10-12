// Catálogo físico de la simulación: seis columnas, sin plazas ficticias en la última fila.
const crearMapaAsientos = (capacidad) => {
  const n = Number(capacidad);
  if (!Number.isInteger(n) || n < 1 || n > 600) throw new Error('Capacidad de aeronave inválida');
  const columnas = ['A', 'B', 'C', 'D', 'E', 'F'];
  const asientos = Array.from({ length: n }, (_, i) => `${Math.floor(i / 6) + 1}${columnas[i % 6]}`);
  const filas = Math.ceil(n / 6);
  return { capacidad: n, filas, columnas, asientos, filasSalida: [12, 13].filter(f => f <= filas) };
};
module.exports = { crearMapaAsientos };
