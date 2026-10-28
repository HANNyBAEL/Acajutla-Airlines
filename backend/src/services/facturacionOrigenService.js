const pool = require('../config/db');

const resolverPoliticaFacturacion = async (reservationId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT COALESCE(NULLIF(BINARY c.code, BINARY ''), NULLIF(BINARY ao.country_code, BINARY '')) AS origin_country_code,
            ao.iata_code AS origin_airport_code
     FROM flight_segments fs
     JOIN flights f ON f.id = fs.flight_id
     JOIN routes rt ON rt.id = f.route_id
     JOIN airports ao ON ao.id = rt.origin_id
     LEFT JOIN countries c ON c.id = ao.country_id
     WHERE fs.reservation_id = ?
     ORDER BY f.departure_datetime, fs.id
     LIMIT 1`,
    [reservationId]
  );
  const codigoPais = String(rows[0]?.origin_country_code || '').trim().toUpperCase();

  if (!codigoPais) {
    return {
      tipo: 'revision_manual',
      origen: rows[0]?.origin_airport_code || null,
      codigo_pais: null,
      mensaje: 'No se pudo confirmar el país de origen del primer vuelo; la facturación requiere revisión manual.'
    };
  }

  if (codigoPais === 'SV') {
    return {
      tipo: 'dte_salvador',
      origen: rows[0].origin_airport_code,
      codigo_pais: codigoPais,
      mensaje: 'El primer vuelo sale de El Salvador; aplica el flujo DTE configurado.'
    };
  }

  return {
    tipo: 'recibo_venta',
    origen: rows[0].origin_airport_code,
    codigo_pais: codigoPais,
    mensaje: 'El primer vuelo no sale de El Salvador; se omite el DTE salvadoreño y se envía un recibo de venta.'
  };
};

module.exports = { resolverPoliticaFacturacion };
