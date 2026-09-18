const pool = require('../config/db');

const round = (n) => Math.round(Number(n) * 100) / 100;

const obtenerImpuestos = async (flightId, tarifaNeta, connection = pool) => {
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
     FROM tax_rules WHERE active = 1 AND country_id = ? AND (airport_id IS NULL OR airport_id = ?)
       AND applies_to IN ('all', ?) AND valid_from <= NOW() AND (valid_to IS NULL OR valid_to > NOW())
     ORDER BY airport_id IS NULL, id`,
    [f.country_id, f.airport_id, f.trip_type]
  );
  const lines = rules.map((rule) => {
    const amount = rule.calculation_type === 'percentage' ? round(tarifaNeta * Number(rule.value) / 100) : round(rule.value);
    return { ...rule, amount, taxable_amount: round(tarifaNeta), country_id: f.country_id, airport_id: f.airport_id };
  });
  return { lines, total: round(lines.reduce((sum, line) => sum + line.amount, 0)), trip_type: f.trip_type };
};

module.exports = { obtenerImpuestos };
