const DTEService = require('../services/dte/dteService');
const DTE = require('../models/DTE');
const Reserva = require('../models/Reserva');

const emitirDTE = async (req, res) => {
  try {
    const { dte_type, pnr, receiver, payment_method, payment_condition, payment_reference } = req.body;
    const reserva = await Reserva.obtenerDetalleCompleto(pnr);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
    if (!['paid', 'confirmed'].includes(reserva.status)) return res.status(400).json({ error: 'La reserva debe estar pagada o confirmada' });
    const vuelo = reserva.passengers[0];
    const vueloData = { flight_number: vuelo.flight_number, origin: vuelo.origin, destination: vuelo.destination, departure_datetime: vuelo.departure_datetime };
    const pago = { forma_pago: payment_method || '03', condicion_operacion: payment_condition || '1', referencia: payment_reference || null };
    const resultado = await DTEService.emitirDTE(dte_type, reserva, vueloData, receiver, pago);
    res.status(201).json({ exito: true, mensaje: 'DTE emitido', datos: resultado });
  } catch (error) {
    console.error('❌ Error al emitir DTE:', error);
    res.status(500).json({ error: 'Error al emitir DTE', detalle: error.message });
  }
};

const listarDTEs = async (req, res) => {
  try {
    const dtes = await DTEService.listar(req.query);
    res.json({ exito: true, total: dtes.length, datos: dtes });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const obtenerDTE = async (req, res) => {
  try {
    const dte = await DTE.obtenerCompleto(req.params.uuid);
    if (!dte) return res.status(404).json({ error: 'DTE no encontrado' });
    res.json({ exito: true, datos: dte });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

// Nuevos handlers para PDF y JSON
const obtenerPDF = async (req, res) => {
  try {
    const dte = await DTE.obtenerCompleto(req.params.uuid);
    if (!dte) return res.status(404).json({ error: 'DTE no encontrado' });
    // Generar PDF simulado - en producción usar librería como pdfkit
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DTE-${req.params.uuid}.pdf"`);
    res.send('Simulación de PDF para DTE: ' + req.params.uuid);
  } catch (error) {
    res.status(500).json({ error: 'Error interno al generar PDF' });
  }
};

const obtenerJSON = async (req, res) => {
  try {
    const dte = await DTE.obtenerCompleto(req.params.uuid);
    if (!dte) return res.status(404).json({ error: 'DTE no encontrado' });
    res.json({ exito: true, datos: dte });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const dtesPorReserva = async (req, res) => {
  try {
    const reserva = await Reserva.buscarPorPNR(req.params.pnr);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
    const dtes = await DTE.buscarPorReserva(reserva.id);
    res.json({ exito: true, datos: dtes });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const kpisFiscales = async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const kpis = await DTE.obtenerKPIs(fecha);
    res.json({ exito: true, datos: kpis });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const conciliacionFiscal = async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    const reporte = await DTE.conciliacionFiscal(fecha_desde, fecha_hasta);
    res.json({ exito: true, datos: reporte });
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = { emitirDTE, listarDTEs, obtenerDTE, obtenerPDF, obtenerJSON, dtesPorReserva, kpisFiscales, conciliacionFiscal };