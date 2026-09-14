const pool = require('../config/db');

// Marca como 'expired' las reservas pendientes cuyo time_limit venció y
// libera los asientos que mantenían ocupados (flight_segments).
const expirarReservas = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [vencidas] = await connection.query(
      "SELECT id, pnr FROM reservations WHERE status = 'pending' AND time_limit < NOW() FOR UPDATE"
    );
    if (!vencidas.length) { await connection.commit(); return { expiradas: 0 }; }
    const ids = vencidas.map((r) => r.id);
    await connection.query(
      `UPDATE reservations SET status = 'expired',
        cancellation_date = NOW(), cancellation_reason = 'Expirada automáticamente (time limit vencido)'
       WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    await connection.query(
      `DELETE FROM flight_segments WHERE reservation_id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    await connection.commit();
    vencidas.forEach((r) => console.log(`⏰ Reserva ${r.pnr} expirada automáticamente; asientos liberados`));
    return { expiradas: vencidas.length, reservas: vencidas.map((r) => r.pnr) };
  } catch (e) {
    await connection.rollback();
    console.error('Error expirando reservas:', e.message);
    return { expiradas: 0, error: e.message };
  } finally {
    connection.release();
  }
};

const iniciarJobExpiracion = (intervaloMs = 60000) => {
  expirarReservas();
  const timer = setInterval(expirarReservas, intervaloMs);
  if (typeof timer.unref === 'function') timer.unref();
  console.log('⏰ Job de expiración de reservas iniciado (cada ' + Math.round(intervaloMs / 1000) + 's)');
  return timer;
};

module.exports = { expirarReservas, iniciarJobExpiracion };
