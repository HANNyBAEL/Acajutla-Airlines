const svc = require('../services/dteExportService');

const emitir = async (req, res) => {
  try {
    const { tipoDte } = req.body;
    if (tipoDte === '11') {
      const r = await svc.emitirFEXE(req.body);
      return res.status(201).json({ exito: true, mensaje: 'FEXE emitida y sellada', datos: r });
    }
    if (tipoDte === '14') {
      const r = await svc.emitirFSEE(req.body);
      return res.status(201).json({ exito: true, mensaje: 'FSEE emitida y sellada', datos: r });
    }
    res.status(400).json({ error: 'tipoDte debe ser 11 (FEXE) o 14 (FSEE)' });
  } catch (e) {
    console.error('Error FEXE/FSEE:', e);
    res.status(400).json({ error: e.message });
  }
};

const listar = async (req, res) => {
  try {
    const rows = await svc.listar();
    res.json({ exito: true, total: rows.length, datos: rows });
  } catch (e) { res.status(500).json({ error: 'Error interno' }); }
};

module.exports = { emitir: emitir, listar: listar };