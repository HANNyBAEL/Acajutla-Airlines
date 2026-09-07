const crypto = require('crypto');
const pool = require('../config/db');

const generarPNR = () => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pnr = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    pnr += caracteres[bytes[i] % caracteres.length];
  }
  return pnr;
};

const generarPNRUnico = async (connection) => {
  let pnr;
  let existe = true;
  let intentos = 0;

  while (existe && intentos < 10) {
    pnr = generarPNR();
    const [rows] = await connection.query('SELECT id FROM reservations WHERE pnr = ? LIMIT 1', [pnr]);
    existe = rows.length > 0;
    intentos++;
  }

  if (existe) {
    throw new Error('No se pudo generar un PNR único');
  }

  return pnr;
};

module.exports = { generarPNR, generarPNRUnico };