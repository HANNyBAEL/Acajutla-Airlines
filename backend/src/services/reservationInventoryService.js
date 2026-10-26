// El llamador mantiene bloqueada la reserva y controla commit/rollback.
// Solo las líneas activas devuelven stock: repetir la operación no duplica unidades.
const cancelarServiciosReserva = async (reservationId, conn) => {
  const [lines] = await conn.query(
    "SELECT id, flight_id, ancillary_id FROM reservation_ancillaries WHERE reservation_id = ? AND status = 'active' ORDER BY flight_id, ancillary_id, id FOR UPDATE",
    [reservationId]
  );
  const groups = new Map();
  for (const line of lines) {
    const key = `${line.flight_id}:${line.ancillary_id}`;
    const group = groups.get(key) || { flight: line.flight_id, ancillary: line.ancillary_id, quantity: 0 };
    group.quantity++;
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const [result] = await conn.query(
      'UPDATE flight_ancillaries SET stock = stock + ? WHERE flight_id = ? AND ancillary_id = ?',
      [group.quantity, group.flight, group.ancillary]
    );
    if (result.affectedRows !== 1) throw new Error('No se encontró el inventario del servicio reservado');
  }
  if (lines.length) await conn.query(
    "UPDATE reservation_ancillaries SET status = 'cancelled' WHERE reservation_id = ? AND status = 'active'",
    [reservationId]
  );
};
module.exports = { cancelarServiciosReserva };
