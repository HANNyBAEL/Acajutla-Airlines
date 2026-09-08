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
    const totalGrav = esFEEE = esFSEE ? 0 : FC.r2(perDTE * dtes.length);
    const totalCompra = esFSEE ? FC.r2(perDTE * dtes.length) : 0;
    const subTotal = FC.r2(totalGrav + totalCompra);
    const tributo = FC.r2(totalGrav * 0.13);
    const resumen = {
      totalNoSuj: 0, totalExenta: 0, totalGravada: totalGrav, totalCompraExcluidos: totalCompra,
      subTotalVentas: subTotal, totalNoGravado: 0, totalSeguro: 0, totalFlete: 0,
      montoTotalOperacion: FC.r2(subTotal + tributo), ivaRetenido: 0, reteRenta: 0,
      tributos: totalGrav > 0 ? [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: tributo }] : null,
      totalPagar: FC.r2(subTotal + tributo), totalLetras: null, totalNoOnerosas: 0, totaliva: FC.r2(totalGrav * 0.13), saldoFavor: 0
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
    const [r] = await pool.query('SELECT dte_type, reception_seal, full_json, emission_date FROM dte_headers WHERE uuid_generation = ?', [dteUuid]);
    if (!r.length) return res.status(404).json({ error: 'DTE no encontrado' });
    const json = typeof r.full_json === 'string' ? JSON.parse(r.full_json) : r.full_json;
    const v = FC.validarPlazoInvalidacion(json, fechaEvento, new Date().toISOString(), r.emission_date);
    res.json({ exito: true, datos: v });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { aplicar, eventoRetorno, validarInvalidacion };