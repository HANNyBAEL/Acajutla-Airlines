const pool = require('../config/db');
const rgService = require('../services/rgPdfService');

const pdf = async (req, res) => {
  try {
    const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [req.params.uuid]);
    if (!h.length) return res.status(404).json({ error: 'DTE no encontrado' });
    const doc = await rgService.generarPDF(h[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="DTE_' + h[0].control_number + '.pdf"');
    doc.pipe(res);
    doc.end();
  } catch (e) {
    console.error('Error al generar PDF:', e);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar el PDF' });
  }
};

const json = async (req, res) => {
  try {
    const [h] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [req.params.uuid]);
    if (!h.length) return res.status(404).json({ error: 'DTE no encontrado' });
    const row = h[0];
    let parsed = row.full_json;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch (e) { parsed = null; }
    }
    const [items] = await pool.query('SELECT * FROM dte_items WHERE header_id = ? ORDER BY item_number', [row.id]);
    res.json({ exito: true, datos: Object.assign({}, row, { full_json: parsed, items: items }) });
  } catch (e) {
    console.error('Error al cargar JSON:', e);
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { pdf: pdf, json: json };