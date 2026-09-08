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
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Verificar si ya existe un DTE válido para esta reserva (evitar doble facturación)
      const [dtesExistentes] = await connection.query(
        `SELECT id, uuid_generation, transmission_status FROM dte_headers 
         WHERE reservation_id = ? AND dte_type = ? AND transmission_status IN ('accepted', 'transmitted')
         ORDER BY created_at DESC LIMIT 1`,
        [reserva.id, tipoDte]
      );
      
      if (dtesExistentes.length > 0) {
        throw new Error(`Ya existe un DTE ${tipoDte} emitido para esta reserva. UUID: ${dtesExistentes[0].uuid_generation}`);
      }
      
      let builder;
      switch (tipoDte) {
        case '01': builder = new FEBuilder(CONFIG_EMISOR); break;
        case '03': builder = new CCFEBuilder(CONFIG_EMISOR); break;
        default: throw new Error(`Tipo DTE ${tipoDte} no soportado`);
      }

      const dte = await builder.construirDesdeReserva(reserva, vuelo, receptor, pago);
      const correlativo = await DTEService.obtenerCorrelativoSeguro(connection, tipoDte);
      
      // Asignar correlativo al DTE
      dte.identificacion.consecutivo = correlativo;
      dte.identificacion.numeroControl = `${CONFIG_EMISOR.establecimiento}-${CONFIG_EMISOR.puntoVenta}-${String(correlativo).padStart(8, '0')}`;
      
      const dteId = await DTEService.guardarEnBDConConexion(dte, tipoDte, reserva.id, connection);
      const respuestaMH = await DTEService.transmitirMH(dte, tipoDte);

      if (respuestaMH.sello) {
        await connection.query(`UPDATE dte_headers SET transmission_status = ?, reception_seal = ?, reception_date = NOW() WHERE id = ?`, [respuestaMH.estado, respuestaMH.sello, dteId]);
      }

      await connection.commit();
      return { dteId, uuid: dte.identificacion.codigoGeneracion, numeroControl: dte.identificacion.numeroControl, sello: respuestaMH.sello, estado: respuestaMH.estado, dte, correlativo };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Obtener correlativo con bloqueo para evitar concurrencia
  static async obtenerCorrelativoSeguro(connection, tipoDte) {
    const [rows] = await connection.query(
      `SELECT MAX(annual_correlative) AS max_corr FROM dte_headers WHERE dte_type = ? LOCK IN SHARE MODE`,
      [tipoDte]
    );
    return (rows[0]?.max_corr || 0) + 1;
  }

  static async guardarEnBDConConexion(dte, tipoDte, reservationId, connection, estado = 'transmitted') {
    const [result] = await connection.query(
      `INSERT INTO dte_headers (uuid_generation, dte_type, control_number, annual_correlative, emission_date, emission_time, environment, billing_model, operation_type, transmission_status, reservation_id, full_json, issuer_nit, issuer_name, receiver_name, receiver_doc_type, receiver_doc_number, total_non_taxable, total_exempt, total_taxable, total_vat, total_to_pay, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [dte.identificacion.codigoGeneracion, tipoDte, dte.identificacion.numeroControl, dte.identificacion.consecutivo, dte.identificacion.fecEmi, dte.identificacion.horEmi, dte.identificacion.ambiente, dte.identificacion.tipoModelo, dte.identificacion.tipoOperacion, estado, reservationId, JSON.stringify(dte), dte.emisor.nit, dte.emisor.nombre, dte.receptor.nombre, dte.receptor.tipoDocumento, dte.receptor.numDocumento, dte.resumen.totalNoSuj, dte.resumen.totalExenta, dte.resumen.totalGravada, dte.resumen.totalIva || 0, dte.resumen.totalPagar]
    );

    for (const item of dte.cuerpoDocumento) {
      await connection.query(`INSERT INTO dte_items (header_id, item_number, item_type, quantity, unit_measure, description, unit_price, discount_amount, sale_non_taxable, sale_exempt, sale_taxable, vat_item, tribute_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [result.insertId, item.numItem, item.tipoItem, item.cantidad, item.uniMedida, item.descripcion, item.precioUni, item.montoDescu, item.ventaNoSuj, item.ventaExenta, item.ventaGravada, item.ivaItem, item.codTributo]);
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