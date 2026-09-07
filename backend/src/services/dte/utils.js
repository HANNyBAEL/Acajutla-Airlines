const crypto = require('crypto');
const pool = require('../../config/db');

const generarUUIDv4 = () => {
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex').toUpperCase();
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
};

const generarNumeroControl = async (tipoDte, establecimiento = 'M001', puntoVenta = 'P001') => {
  const anio = new Date().getFullYear();
  const [rows] = await pool.query(`SELECT COALESCE(MAX(annual_correlative), 0) + 1 AS siguiente FROM dte_headers WHERE YEAR(emission_date) = ? AND dte_type = ?`, [anio, tipoDte]);
  const correlativo = rows[0].siguiente;
  return `DTE${tipoDte}${establecimiento}${puntoVenta}${String(correlativo).padStart(15, '0')}`;
};

const formatearFecha = (fecha = new Date()) => fecha.toISOString().split('T')[0];
const formatearHora = (fecha = new Date()) => fecha.toTimeString().split(' ')[0];
const redondeoFiscal = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

module.exports = { generarUUIDv4, generarNumeroControl, formatearFecha, formatearHora, redondeoFiscal };