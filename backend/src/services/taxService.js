const pool = require('../config/db');

const round = (n) => Math.round(Number(n) * 100) / 100;

const obtenerImpuestos = async (flightId, tarifaNeta, connection = pool, scope = 'flight') => {
  const [flight] = await connection.query(
    `SELECT f.id, ao.id AS airport_id, ao.country_id, ao.country_code,
            CASE WHEN ao.country_id = ad.country_id THEN 'domestic' ELSE 'international' END AS trip_type
     FROM flights f JOIN routes r ON r.id = f.route_id
     JOIN airports ao ON ao.id = r.origin_id JOIN airports ad ON ad.id = r.destination_id WHERE f.id = ?`,
    [flightId]
  );
  if (!flight.length) throw new Error('Vuelo no encontrado para cálculo fiscal');
  const f = flight[0];
  const [rules] = await connection.query(
    `SELECT id, country_id, airport_id, code, name, calculation_type, value, applies_to
     FROM tax_rules WHERE active = 1 AND scope = ? AND country_id = ? AND (airport_id IS NULL OR airport_id = ?)
       AND applies_to IN ('all', ?) AND valid_from <= NOW() AND (valid_to IS NULL OR valid_to > NOW())
     ORDER BY airport_id IS NULL, id`,
    [scope, f.country_id, f.airport_id, f.trip_type]
  );
  const lines = rules.map((rule) => {
    const amount = rule.calculation_type === 'percentage' ? round(tarifaNeta * Number(rule.value) / 100) : round(rule.value);
    return { ...rule, amount, taxable_amount: round(tarifaNeta), country_id: f.country_id, airport_id: f.airport_id };
  });
  return { lines, total: round(lines.reduce((sum, line) => sum + line.amount, 0)), trip_type: f.trip_type };
};

const calcularPrecioServicio = async (flightId, precioBase, ivaIncluido, connection = pool) => {
  const rawPrice = Number(precioBase);
  if (!Number.isInteger(Number(flightId)) || Number(flightId) <= 0) throw new Error('Vuelo inválido para calcular impuestos');
  if (!Number.isFinite(rawPrice) || rawPrice <= 0 || Math.round(rawPrice * 100) !== rawPrice * 100) throw new Error('El precio del servicio debe ser mayor que cero y tener como máximo dos decimales');
  const base = round(rawPrice);
  const impuestos = await obtenerImpuestos(flightId, base, connection, 'ancillary');
  const cargos = impuestos.lines;
  if (!cargos.length) return { precioFinal: base, iva: 0 };
  const porcentaje = cargos.filter((line) => line.calculation_type === 'percentage')
    .reduce((sum, line) => sum + Number(line.value || 0), 0);
  if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) throw new Error('La tasa de IVA configurada para este vuelo no es válida');
  const fijo = cargos.filter((line) => line.calculation_type !== 'percentage')
    .reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const montoIva = ivaIncluido
    ? round(fijo + Math.max(0, base - fijo) * porcentaje / (100 + porcentaje))
    : round(base * porcentaje / 100 + fijo);
  return { precioFinal: ivaIncluido ? base : round(base + montoIva), iva: montoIva };
};

module.exports = { obtenerImpuestos, calcularPrecioServicio };
