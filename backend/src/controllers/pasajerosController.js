const Pasajero = require('../models/Pasajero');
const pool = require('../config/db');
const { documentoNumericoValido, normalizarNumeroDocumento } = require('../utils/documentNumber');

const listarPorReserva = async (req, res) => {
  try {
    const pasajeros = await Pasajero.listarPorReserva(req.params.reservation_id);
    res.json({ exito: true, total: pasajeros.length, datos: pasajeros });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const buscarPorDocumento = async (req, res) => {
  try {
    const { doc_type, doc_number } = req.params;
    const historial = await Pasajero.buscarPorDocumento(doc_type, doc_number);
    res.json({ exito: true, total: historial.length, datos: historial });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const actualizarPasajero = async (req, res) => {
  try {
    const datos = Object.assign({}, req.body);
    if (Object.prototype.hasOwnProperty.call(datos, 'document_number') || Object.prototype.hasOwnProperty.call(datos, 'document_type')) {
      const [pasajeros] = await pool.query('SELECT document_type, document_number FROM passengers WHERE id = ?', [req.params.id]);
      if (!pasajeros.length) return res.status(404).json({ error: 'Pasajero no encontrado' });
      const tipoDocumento = datos.document_type || pasajeros[0].document_type;
      const numeroDocumento = datos.document_number !== undefined ? datos.document_number : pasajeros[0].document_number;
      if (!documentoNumericoValido(numeroDocumento, tipoDocumento)) {
        return res.status(400).json({ error: 'El documento debe contener solo números y tener un formato válido para su tipo' });
      }
      if (datos.document_number !== undefined) datos.document_number = normalizarNumeroDocumento(numeroDocumento, tipoDocumento);
    }
    const resultado = await Pasajero.actualizar(req.params.id, datos);
    if (!resultado.actualizado) return res.status(400).json({ error: 'No hay datos válidos para actualizar' });
    res.json({ exito: true, mensaje: 'Pasajero actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listarPorReserva, buscarPorDocumento, actualizarPasajero };
