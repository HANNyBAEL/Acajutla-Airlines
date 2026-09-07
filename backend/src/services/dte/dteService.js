const pool = require('../../config/db');
const FEBuilder = require('./builders/feBuilder');
const CCFEBuilder = require('./builders/ccfeBuilder');

const CONFIG_EMISOR = {
  ambiente: process.env.DTE_AMBIENTE || '00',
  establecimiento: 'M001',
  puntoVenta: 'P001',
  emisor: {
    nit: (process.env.DTE_NIT || '06141234561010').replace(/-/g, ''),
    nrc: (process.env.DTE_NRC || '1234567').replace(/-/g, ''),
    nombre: 'ACAJUTLA AIRLINES S.A. DE C.V.',
    codActividad: '51100',
    descActividad: 'Transporte aéreo de pasajeros',
    nombreComercial: 'ACAJUTLA AIRLINES',
    direccion: { departamento: '03', municipio: '18', distrito: '15', complemento: 'Puerto de Acajutla, Sonsonate' },
    telefono: '23456789',
    correo: 'facturacion@acajutlaairlines.com'
  }
};

class DTEService {
  static async emitirDTE(tipoDte, reserva, vuelo, receptor, pago) {
    let builder;
    switch (tipoDte) {
      case '01': builder = new FEBuilder(CONFIG_EMISOR); break;
      case '03': builder = new CCFEBuilder(CONFIG_EMISOR); break;
      default: throw new Error(`Tipo DTE ${tipoDte} no soportado`);
    }

    const dte = await builder.construirDesdeReserva(reserva, vuelo, receptor, pago);
    const dteId = await DTEService.guardarEnBD(dte, tipoDte, reserva.id);
    const respuestaMH = await DTEService.transmitirMH(dte, tipoDte);

    if (respuestaMH.sello) {
      await pool.query(`UPDATE dte_headers SET transmission_status = ?, reception_seal = ?, reception_date = NOW() WHERE id = ?`, [respuestaMH.estado, respuestaMH.sello, dteId]);
    }

    return { dteId, uuid: dte.identificacion.codigoGeneracion, numeroControl: dte.identificacion.numeroControl, sello: respuestaMH.sello, estado: respuestaMH.estado, dte };
  }

  static async guardarEnBD(dte, tipoDte, reservationId, estado = 'transmitted') {
    const [result] = await pool.query(
      `INSERT INTO dte_headers (uuid_generation, dte_type, control_number, annual_correlative, emission_date, emission_time, environment, billing_model, operation_type, transmission_status, reservation_id, full_json, issuer_nit, issuer_name, receiver_name, receiver_doc_type, receiver_doc_number, total_non_taxable, total_exempt, total_taxable, total_vat, total_to_pay, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [dte.identificacion.codigoGeneracion, tipoDte, dte.identificacion.numeroControl, 1, dte.identificacion.fecEmi, dte.identificacion.horEmi, dte.identificacion.ambiente, dte.identificacion.tipoModelo, dte.identificacion.tipoOperacion, estado, reservationId, JSON.stringify(dte), dte.emisor.nit, dte.emisor.nombre, dte.receptor.nombre, dte.receptor.tipoDocumento, dte.receptor.numDocumento, dte.resumen.totalNoSuj, dte.resumen.totalExenta, dte.resumen.totalGravada, dte.resumen.totalIva || 0, dte.resumen.totalPagar]
    );

    for (const item of dte.cuerpoDocumento) {
      await pool.query(`INSERT INTO dte_items (header_id, item_number, item_type, quantity, unit_measure, description, unit_price, discount_amount, sale_non_taxable, sale_exempt, sale_taxable, vat_item, tribute_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [result.insertId, item.numItem, item.tipoItem, item.cantidad, item.uniMedida, item.descripcion, item.precioUni, item.montoDescu, item.ventaNoSuj, item.ventaExenta, item.ventaGravada, item.ivaItem, item.codTributo]);
    }
    return result.insertId;
  }

  static async transmitirMH(dte, tipoDte) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const exito = Math.random() > 0.05;
    if (exito) return { estado: 'accepted', sello: 'MH-' + Date.now().toString(36).toUpperCase(), fechaRecepcion: new Date().toISOString() };
    return { estado: 'rejected', errores: ['Error simulado'], fechaRecepcion: new Date().toISOString() };
  }

  static async listar(filtros = {}) {
    let sql = `SELECT * FROM dte_headers WHERE 1=1`;
    const valores = [];
    if (filtros.tipo) { sql += ' AND dte_type = ?'; valores.push(filtros.tipo); }
    if (filtros.estado) { sql += ' AND transmission_status = ?'; valores.push(filtros.estado); }
    sql += ' ORDER BY emission_date DESC LIMIT 100';
    const [rows] = await pool.query(sql, valores);
    return rows;
  }

  static async obtenerPorUUID(uuid) {
    const [rows] = await pool.query('SELECT * FROM dte_headers WHERE uuid_generation = ?', [uuid]);
    return rows[0];
  }
}

module.exports = DTEService;