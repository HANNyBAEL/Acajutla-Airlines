const notasService = require('../services/notasService');
const pagoDteService = require('../services/pagoDteService');

const listar = async (req, res) => {
  try {
    const rows = await notasService.listarNotas();
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const origenes = async (req, res) => {
  try {
    const rows = await notasService.origenes();
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

const crear = async (req, res) => {
  try {
    const r = await notasService.generarNota(req.body);
    let correo;
    try { correo = await pagoDteService.enviarDTEExistente(r.uuid); }
    catch (e) { correo = { enviado: false, motivo: e.message }; }
    res.status(201).json({ exito: true, mensaje: 'Nota emitida y sellada', datos: Object.assign({}, r, { correo: correo }) });
  } catch (e) {
    console.error('Error nota:', e);
    res.status(400).json({ error: e.message });
  }
};

module.exports = { listar: listar, origenes: origenes, crear: crear };
