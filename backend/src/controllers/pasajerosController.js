const Pasajero = require('../models/Pasajero');

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
    const resultado = await Pasajero.actualizar(req.params.id, req.body);
    if (!resultado.actualizado) return res.status(400).json({ error: 'No hay datos válidos para actualizar' });
    res.json({ exito: true, mensaje: 'Pasajero actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { listarPorReserva, buscarPorDocumento, actualizarPasajero };