const pool = require('../config/db');
const FC = require('../services/fiscalCompliance');
const dteEventosService = require('../services/dteEventosService');
const mailerService = require('../services/mailerService');

const aplicar = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, dte_type, reception_seal, full_json, reservation_id FROM dte_headers WHERE full_json IS NOT NULL');
    let n = 0;
    for (const r of rows) {
      let json = typeof r.full_json === 'string' ? JSON.parse(r.full_json) : r.full_json;
      let pago = null;
      if (r.reservation_id) {
        const [p] = await pool.query("SELECT method FROM payments WHERE reservation_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 1", [r.reservation_id]);
        pago = p[0] ? p[0].method : null;
      }
      json = FC.normalizarRedondeo(json);
      if (['01','03','11','14'].includes(String(json.identificacion.tipoDte))) json = FC.asegurarPagos(json, pago);
      json = FC.asegurarFusion(json);
      json = FC.asegurarNCE_NDE(json);
      json = FC.firmar(json);
      if (r.reception_seal) json = FC.sellar(json, r.reception_seal);
      await pool.query('UPDATE dte_headers SET full_json = ? WHERE id = ?', [JSON.stringify(json), r.id]);
      n++;
    }
    res.json({ exito: true, mensaje: 'Cumplimiento aplicado a ' + n + ' DTE(s)', datos: { aplicados: n } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const eventoRetorno = async (req, res) => {
  try {
    const { dteUuids, monto, descripcion } = req.body;
    const resultado = await dteEventosService.retornarDTEs(dteUuids, { monto, motivo: descripcion });
    let correo;
    try { correo = await mailerService.enviarEventoRetorno(resultado.uuid); }
    catch (e) { correo = { enviado: false, motivo: e.message }; console.error('Error enviando aviso de Evento de Retorno:', e); }
    res.status(201).json({ exito: true, mensaje: 'Evento de Retorno simulado y sellado', datos: { ...resultado, json: resultado.evento, correo } });
  } catch (e) { res.status(e.code ? 500 : 400).json({ error: e.message }); }
};

const validarInvalidacion = async (req, res) => {
  try {
    const { dteUuid, fechaEvento } = req.body;
    if (!dteUuid || !fechaEvento) return res.status(400).json({ error: 'dteUuid y fechaEvento son obligatorios' });
    const [r] = await pool.query('SELECT dte_type, transmission_status, reception_seal, full_json, emission_date, reception_date, created_at FROM dte_headers WHERE uuid_generation = ?', [dteUuid]);
    if (!r.length) return res.status(404).json({ error: 'DTE no encontrado' });
    if (r[0].transmission_status !== 'accepted' || !r[0].reception_seal) return res.status(409).json({ exito: true, datos: { ok: false, mensaje: 'Solo se valida el plazo para DTEs aceptados con Sello de Recepción.' } });
    const json = typeof r[0].full_json === 'string' ? JSON.parse(r[0].full_json) : r[0].full_json;
    const v = FC.validarPlazoInvalidacion(json, fechaEvento, new Date(), r[0].reception_date || r[0].created_at);
    res.json({ exito: true, datos: v });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { aplicar, eventoRetorno, validarInvalidacion };
