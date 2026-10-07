const pool = require('../config/db');
const FC = require('../services/fiscalCompliance');
const crypto = require('crypto');

async function asegurarTabla() {
  await pool.query(`CREATE TABLE IF NOT EXISTS fiscal_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_evento VARCHAR(20) NOT NULL,
    uuid VARCHAR(36) NOT NULL,
    dte_uuids JSON,
    full_json JSON,
    sello VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
}

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
    await asegurarTabla();
    const { dteUuids, monto, descripcion } = req.body;
    if (!Array.isArray(dteUuids) || !dteUuids.length) return res.status(400).json({ error: 'Seleccione al menos un DTE' });
    const [rows] = await pool.query('SELECT dte_type, reception_seal, full_json, emission_date FROM dte_headers WHERE uuid_generation IN (?)', [dteUuids]);
    if (rows.length !== dteUuids.length) return res.status(404).json({ error: 'Algún DTE no existe' });
    const dtes = rows.map((r) => { const j = typeof r.full_json === 'string' ? JSON.parse(r.full_json) : r.full_json; j._sello = r.reception_seal; j._selloFecha = r.emission_date; return j; });
    const v = FC.validarRetorno(dtes, Number(monto || 0), new Date().toISOString());
    if (!v.ok) return res.status(400).json({ error: v.mensaje });
    const d0 = dtes[0];
    const perDTE = FC.r2(Number(monto) / dtes.length);
    const esFSEE = String(d0.identificacion.tipoDte) === '14';
    const cuerpo = dtes.map((d, i) => ({
      numItem: i + 1, codigoGeneracion: d.identificacion.codigoGeneracion, tipoItem: 1, cantidad: 1, codigo: null,
      uniMedida: 59, descripcion: descripcion || 'Retorno de bienes / reembolso', precioUni: perDTE, montoDescu: 0,
      ventaNoSuj: 0, ventaExenta: 0, ventaGravada: esFSEE ? 0 : perDTE, compra: esFSEE ? perDTE : 0,
      tributos: null, ivaRete: 0, reteRenta: 0, seguro: 0, flete: 0, noGravado: 0
    }));
    const totalGrav = esFSEE ? 0 : FC.r2(perDTE * dtes.length);
    const totalCompra = esFSEE ? FC.r2(perDTE * dtes.length) : 0;
    const subTotal = FC.r2(totalGrav + totalCompra);
    // El IVA se replica en la proporción que tenían los DTE originales (cuyos
    // tributos provienen de "Fiscalidad y tasas"); no hay tasa fija en código.
    let ivaOrig = 0, gravOrig = 0, descIva = null;
    for (const d of dtes) {
      const rs = d.resumen || {};
      const t20 = (Array.isArray(rs.tributos) ? rs.tributos : []).find((t) => String(t.codigo) === '20');
      if (t20 && !descIva) descIva = t20.descripcion;
      ivaOrig += Number(String(d.identificacion.tipoDte) === '03' ? (t20 ? t20.valor : 0) : (rs.totalIva || 0)) || 0;
      gravOrig += Number(rs.totalGravada) || 0;
    }
    const tributo = gravOrig > 0 ? FC.r2(totalGrav * (ivaOrig / gravOrig)) : 0;
    const resumen = {
      totalNoSuj: 0, totalExenta: 0, totalGravada: totalGrav, totalCompraExcluidos: totalCompra,
      subTotalVentas: subTotal, totalNoGravado: 0, totalSeguro: 0, totalFlete: 0,
      montoTotalOperacion: FC.r2(subTotal + tributo), ivaRetenido: 0, reteRenta: 0,
      tributos: tributo > 0 ? [{ codigo: '20', descripcion: descIva || 'Impuesto al Valor Agregado', valor: tributo }] : null,
      totalPagar: FC.r2(subTotal + tributo), totalLetras: null, totalNoOnerosas: 0, totaliva: tributo, saldoFavor: 0
    };
    const fh = new Date();
    const json = {
      identificacion: { version: 1, ambiente: process.env.DTE_AMBIENTE || '00', tipoModelo: 1, tipoOperacion: 1, tipoContingencia: null, motivoContin: null, codigoGeneracion: crypto.randomUUID().toUpperCase(), tipoEvento: '18', fecCEmi: fh.toISOString().slice(0,10), horEmi: fh.toTimeString().slice(0,8), fusion: null, tipoMoneda: 'USD' },
      documentosRelacionados: dtes.map((d) => ({ tipoDocumento: String(d.identificacion.tipoDte), codigoGeneracion: d.identificacion.codigoGeneracion, fechaEmision: d.identificacion.fecEmi })),
      emisor: d0.emisor, receptor: d0.receptor, ventaTercero: d0.ventaTercero || null, compraTercero: d0.compraTercero || null,
      cuerpoDocumento: cuerpo, resumen: resumen, apendice: null
    };
    FC.firmar(json);
    const sello = 'SELLO-' + crypto.randomBytes(12).toString('hex').toUpperCase();
    FC.sellar(json, sello);
    await pool.query('INSERT INTO fiscal_events (tipo_evento, uuid, dte_uuids, full_json, sello) VALUES (?,?,?,?,?)', ['retorno', json.identificacion.codigoGeneracion, JSON.stringify(dteUuids), JSON.stringify(json), sello]);
    res.status(201).json({ exito: true, mensaje: 'Evento de Retorno transmitido y sellado', datos: { uuid: json.identificacion.codigoGeneracion, sello: sello, json: json } });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
