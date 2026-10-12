const pool = require('../../config/db');

// GET_LOCK pertenece a la conexión, funciona entre procesos y se libera aun al fallar.
// Se usa una clave global porque también hay documentos relacionados y reemisiones.
async function serializarEmision(emitir) {
  const conn = await pool.getConnection();
  const key = 'skymanager:school:dte';
  let locked = false;
  try {
    const [rows] = await conn.query('SELECT GET_LOCK(?, 15) AS acquired', [key]);
    locked = Number(rows[0]?.acquired) === 1;
    if (!locked) throw new Error('La emisión está ocupada. Intenta nuevamente.');
    return await emitir(conn);
  } finally {
    try { if (locked) await conn.query('SELECT RELEASE_LOCK(?) AS released', [key]); }
    finally { conn.release(); }
  }
}
async function siguienteControl(tipo, conn) {
  // El número no contiene el año: no reiniciarlo evita colisiones entre años.
  const [rows] = await conn.query('SELECT COALESCE(MAX(CAST(RIGHT(control_number, 15) AS UNSIGNED)), 0) + 1 AS n FROM dte_headers WHERE dte_type = ?', [tipo]);
  const seq = Number(rows[0].n);
  return { numero: 'DTE-' + tipo + '-M001P001-' + String(seq).padStart(15, '0'), seq };
}
module.exports = { serializarEmision, siguienteControl };
