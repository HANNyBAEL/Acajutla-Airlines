const svc = require('../services/dteEventosService');
const dteService = require('../services/dteService');

const pendientes = async (req, res) => {
  try { res.json({ exito: true, datos: await svc.listarPendientes() }); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const eventoContingencia = async (req, res) => {
  try {
    const r = await svc.transmitirEventoContingencia(req.body);
    res.json({ exito: true, mensaje: 'Evento de contingencia transmitido y aceptado', datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

const invalidar = async (req, res) => {
  try {
    const r = await svc.invalidarDTE(req.params.uuid, req.body);
    res.json({ exito: true, mensaje: 'Evento de invalidación transmitido', datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

const eventos = async (req, res) => {
  try { res.json({ exito: true, datos: await svc.listarEventos() }); }
  catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const emitirContingencia = async (req, res) => {
  try {
    const { reservation_id, tipo_dte, tipoContingencia, motivoContin } = req.body;
    const r = await dteService.emitirDTE({
      reservation_id: reservation_id, tipo_dte: tipo_dte,
      contingencia: { tipoContingencia: tipoContingencia || 1, motivoContin: motivoContin || null }
    });
    res.status(201).json({ exito: true, mensaje: 'DTE generado en contingencia (pendiente de transmisión)', datos: r });
  } catch (e) { res.status(400).json({ error: e.message }); }
};

module.exports = { pendientes, eventoContingencia, invalidar, eventos, emitirContingencia };