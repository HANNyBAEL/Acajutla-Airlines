import { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { descargarCSV, nombreCSVConPeriodo } from '../utils/csv';
import { descargarExcelTablas } from '../utils/excel';

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const FECHA_INICIAL = new Date();

const Reportes = () => {
  const [desde, setDesde] = useState(fmt(new Date(FECHA_INICIAL.getTime() - 30 * 24 * 3600 * 1000)));
  const [hasta, setHasta] = useState(fmt(FECHA_INICIAL));
  const [ingresos, setIngresos] = useState(null);
  const [ocupacion, setOcupacion] = useState([]);
  const [conciliacion, setConciliacion] = useState([]);
  const [dte, setDte] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [periodoAplicado, setPeriodoAplicado] = useState(null);
  const totales = (ingresos && ingresos.totales) || {};
  const serie = (ingresos && ingresos.serie) || [];
  const porMetodo = (ingresos && ingresos.porMetodo) || [];
  const porCanal = (ingresos && ingresos.porCanal) || [];
  const periodoExportacion = periodoAplicado || { desde, hasta };

  const cargar = () => {
    if (desde && hasta && desde > hasta) {
      toast.error('La fecha "Desde" no puede ser posterior a "Hasta"');
      return;
    }
    setCargando(true);
    const params = { desde: desde, hasta: hasta };
    Promise.all([
      api.get('/reportes/ingresos', { params: params }),
      api.get('/reportes/ocupacion', { params: params }),
      api.get('/reportes/conciliacion', { params: params }),
      api.get('/reportes/dte', { params: params })
    ])
      .then((res) => {
        setIngresos(res[0].data.datos);
        setOcupacion(res[1].data.datos || []);
        setConciliacion(res[2].data.datos || []);
        setDte(res[3].data.datos);
        setPeriodoAplicado(params);
      })
      .catch(() => toast.error('Error al cargar reportes'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const exportarCSV = () => {
    if (!conciliacion.length) return toast.error('No hay datos para exportar');
    descargarCSV(nombreCSVConPeriodo('conciliacion_fiscal', periodoExportacion.desde, periodoExportacion.hasta),
      ['Fecha DTE', 'Pagos imputados a fecha DTE (USD)', 'Facturado DTE (USD)', 'Diferencia (USD)', 'Estado'],
      conciliacion.map((c) => [c.fecha, Number(c.pagos || 0), Number(c.facturado || 0), Number(c.diferencia || 0), c.estado]));
    toast.success('CSV exportado');
  };

  const exportarSerieIngresos = () => {
    if (!serie.length) return toast.error('No hay ingresos para exportar');
    descargarCSV(nombreCSVConPeriodo('ingresos_diarios', periodoExportacion.desde, periodoExportacion.hasta),
      ['Fecha', 'Ingresos brutos (USD)', 'Reembolsos (USD)', 'Ingresos netos (USD)'],
      serie.map((r) => [r.fecha, Number(r.bruto || 0).toFixed(2), Number(r.reembolsos || 0).toFixed(2), Number(r.neto || 0).toFixed(2)]));
    toast.success('CSV de ingresos exportado');
  };

  const exportarMetodos = () => {
    if (!porMetodo.length) return toast.error('No hay datos para exportar');
    descargarCSV(nombreCSVConPeriodo('ingresos_por_metodo', periodoExportacion.desde, periodoExportacion.hasta),
      ['Método de pago', 'Operaciones', 'Monto (USD)'],
      porMetodo.map((r) => [r.method, Number(r.operaciones || 0), Number(r.monto || 0).toFixed(2)]));
    toast.success('CSV de métodos exportado');
  };

  const exportarCanales = () => {
    if (!porCanal.length) return toast.error('No hay datos para exportar');
    descargarCSV(nombreCSVConPeriodo('ingresos_por_canal', periodoExportacion.desde, periodoExportacion.hasta),
      ['Canal de venta', 'Operaciones', 'Monto (USD)'],
      porCanal.map((r) => [r.canal, Number(r.operaciones || 0), Number(r.monto || 0).toFixed(2)]));
    toast.success('CSV de canales exportado');
  };

  const exportarOcupacion = () => {
    if (!ocupacion.length) return toast.error('No hay vuelos para exportar');
    descargarCSV(nombreCSVConPeriodo('ocupacion_por_ruta', periodoExportacion.desde, periodoExportacion.hasta),
      ['Ruta', 'Origen', 'Destino', 'Vuelos', 'Capacidad', 'Vendidos', 'Ocupación (%)'],
      ocupacion.map((r) => [r.ruta, r.origen, r.destino, Number(r.vuelos || 0), Number(r.capacidad || 0), Number(r.vendidos || 0), Number(r.ocupacion || 0).toFixed(2)]));
    toast.success('CSV de ocupación exportado');
  };

  const exportarDteTipo = () => {
    if (!dte?.porTipo?.length) return toast.error('No hay DTE para exportar');
    descargarCSV(nombreCSVConPeriodo('dte_por_tipo_y_estado', periodoExportacion.desde, periodoExportacion.hasta),
      ['Tipo DTE', 'Estado', 'Cantidad', 'Monto (USD)'],
      dte.porTipo.map((r) => [r.dte_type, r.transmission_status, Number(r.total || 0), Number(r.monto || 0).toFixed(2)]));
    toast.success('CSV de DTE exportado');
  };

  const exportarBitacora = () => {
    if (!dte?.bitacora?.length) return toast.error('No hay transmisiones para exportar');
    descargarCSV(nombreCSVConPeriodo('bitacora_dte_ultimas_100', periodoExportacion.desde, periodoExportacion.hasta),
      ['Número de control', 'Tipo DTE', 'Fecha de emisión', 'Estado', 'Sello de recepción', 'Monto (USD)', 'Reserva'],
      dte.bitacora.map((r) => [r.control_number, r.dte_type, r.emission_date, r.transmission_status, r.reception_seal || '', Number(r.total_to_pay || 0).toFixed(2), r.reservation_id || '']));
    toast.success('CSV de bitácora exportado');
  };

  const exportarExcel = async () => {
    const hojas = [
      {
        name: 'Ingresos diarios', tableName: 'IngresosDiarios',
        headers: ['Fecha', 'Ingresos brutos (USD)', 'Reembolsos (USD)', 'Ingresos netos (USD)'],
        rows: serie.map((r) => [r.fecha, Number(r.bruto || 0), Number(r.reembolsos || 0), Number(r.neto || 0)]),
        widths: [16, 24, 22, 22], numberFormats: { 2: '$#,##0.00', 3: '$#,##0.00', 4: '$#,##0.00' }
      },
      {
        name: 'Métodos de pago', tableName: 'MetodosPago',
        headers: ['Método de pago', 'Operaciones', 'Monto (USD)'],
        rows: porMetodo.map((r) => [r.method, Number(r.operaciones || 0), Number(r.monto || 0)]),
        widths: [22, 16, 20], numberFormats: { 3: '$#,##0.00' }
      },
      {
        name: 'Canales de venta', tableName: 'CanalesVenta',
        headers: ['Canal de venta', 'Operaciones', 'Monto (USD)'],
        rows: porCanal.map((r) => [r.canal, Number(r.operaciones || 0), Number(r.monto || 0)]),
        widths: [22, 16, 20], numberFormats: { 3: '$#,##0.00' }
      },
      {
        name: 'Ocupación', tableName: 'OcupacionRutas',
        headers: ['Ruta', 'Origen', 'Destino', 'Vuelos', 'Capacidad', 'Vendidos', 'Ocupación (%)'],
        rows: ocupacion.map((r) => [r.ruta, r.origen, r.destino, Number(r.vuelos || 0), Number(r.capacidad || 0), Number(r.vendidos || 0), Number(r.ocupacion || 0) / 100]),
        widths: [22, 14, 14, 12, 14, 14, 18], numberFormats: { 7: '0.00%' }
      },
      {
        name: 'Conciliación fiscal', tableName: 'ConciliacionFiscal',
        headers: ['Fecha DTE', 'Pagos imputados a fecha DTE (USD)', 'Facturado DTE (USD)', 'Diferencia (USD)', 'Estado'],
        rows: conciliacion.map((r) => [r.fecha, Number(r.pagos || 0), Number(r.facturado || 0), Number(r.diferencia || 0), r.estado]),
        widths: [16, 24, 23, 20, 18], numberFormats: { 2: '$#,##0.00', 3: '$#,##0.00', 4: '$#,##0.00' }
      },
      {
        name: 'DTE por tipo', tableName: 'DtePorTipo',
        headers: ['Tipo DTE', 'Estado', 'Cantidad', 'Monto (USD)'],
        rows: dte?.porTipo?.map((r) => [r.dte_type, r.transmission_status, Number(r.total || 0), Number(r.monto || 0)]) || [],
        widths: [16, 20, 14, 20], numberFormats: { 4: '$#,##0.00' }
      },
      {
        name: 'Bitácora DTE', tableName: 'BitacoraDte',
        headers: ['Número de control', 'Tipo DTE', 'Fecha de emisión', 'Estado', 'Sello de recepción', 'Monto (USD)', 'Reserva'],
        rows: dte?.bitacora?.map((r) => [r.control_number, r.dte_type, r.emission_date, r.transmission_status, r.reception_seal || '', Number(r.total_to_pay || 0), r.reservation_id || '']) || [],
        widths: [38, 14, 18, 20, 42, 20, 14], numberFormats: { 6: '$#,##0.00' }
      }
    ].filter((sheet) => sheet.rows.length);

    if (!hojas.length) return toast.error('No hay reportes cargados para exportar');
    setExportandoExcel(true);
    try {
      await descargarExcelTablas(`reportes_${periodoExportacion.desde}_${periodoExportacion.hasta}.xlsx`, hojas);
      toast.success('Libro Excel con tablas y filtros exportado');
    } catch (error) {
      console.error('Error al crear Excel de reportes:', error);
      toast.error('No se pudo crear el archivo Excel');
    } finally {
      setExportandoExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reportes Estratégicos</h1>
          <p className="text-gray-500 mt-1">Ingresos, ocupación, conciliación fiscal y bitácora DTE</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary flex items-center space-x-2" onClick={exportarCSV}>
            <FiDownload /><span>Exportar conciliación (CSV)</span>
          </button>
          <button className="btn-primary flex items-center space-x-2" onClick={exportarExcel} disabled={exportandoExcel}>
            <FiDownload /><span>{exportandoExcel ? 'Preparando Excel...' : 'Exportar todos (Excel)'}</span>
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" className="input-field" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" className="input-field" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <button className="btn-primary flex items-center space-x-2" onClick={cargar} disabled={cargando}>
            <FiRefreshCw /><span>{cargando ? 'Cargando...' : 'Aplicar filtros'}</span>
          </button>
          <div className="text-sm text-gray-500 md:text-right">Período: {desde} → {hasta}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-sm text-gray-500">Ingresos brutos</p><p className="text-2xl font-bold text-green-700">${Number(totales.bruto || 0).toFixed(2)}</p></div>
        <div className="card p-5"><p className="text-sm text-gray-500">Reembolsos</p><p className="text-2xl font-bold text-red-700">${Number(totales.reembolsos || 0).toFixed(2)}</p></div>
        <div className="card p-5"><p className="text-sm text-gray-500">Ingreso neto</p><p className="text-2xl font-bold">${(Number(totales.bruto || 0) - Number(totales.reembolsos || 0)).toFixed(2)}</p></div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Ingresos diarios (bruto vs neto)</h3>
          <button className="btn-secondary flex items-center gap-2 text-sm" onClick={exportarSerieIngresos}><FiDownload />CSV</button>
        </div>
        {serie.length === 0 ? <p className="text-sm text-gray-500">Sin pagos en el período.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="bruto" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="neto" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Ingresos por método de pago</h3>
            <button className="btn-secondary flex items-center gap-2 text-sm" onClick={exportarMetodos}><FiDownload />CSV</button>
          </div>
          {porMetodo.length === 0 ? <p className="text-sm text-gray-500">Sin datos.</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porMetodo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <Tooltip formatter={(v) => '$' + Number(v).toFixed(2)} />
                <Bar dataKey="monto" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Ingresos por canal de venta</h3>
            <button className="btn-secondary flex items-center gap-2 text-sm" onClick={exportarCanales}><FiDownload />CSV</button>
          </div>
          {porCanal.length === 0 ? <p className="text-sm text-gray-500">Sin datos.</p> : (
            <ul className="space-y-2">
              {porCanal.map((c) => (
                <li key={c.canal} className="flex justify-between text-sm">
                  <span className="capitalize text-gray-600">{c.canal} ({c.operaciones} ops)</span>
                  <span className="font-semibold">${Number(c.monto).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Ocupación por ruta</h3>
          <button className="btn-secondary flex items-center gap-2 text-sm" onClick={exportarOcupacion}><FiDownload />CSV</button>
        </div>
        {ocupacion.length === 0 ? <p className="text-sm text-gray-500">Sin vuelos en el período.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ruta</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Vuelos</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Capacidad</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Vendidos</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ocupación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ocupacion.map((r) => (
                  <tr key={r.ruta}>
                    <td className="px-4 py-2 font-medium">{r.origen} → {r.destino}</td>
                    <td className="px-4 py-2 text-sm">{r.vuelos}</td>
                    <td className="px-4 py-2 text-sm">{r.capacidad}</td>
                    <td className="px-4 py-2 text-sm">{r.vendidos}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-primary-600 h-2 rounded-full" style={{ width: Math.min(r.ocupacion, 100) + '%' }}></div>
                        </div>
                        <span className="text-sm font-semibold">{r.ocupacion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-3">Conciliación fiscal (pagos vs DTE aceptados)</h3>
        {conciliacion.length === 0 ? <p className="text-sm text-gray-500">Sin datos en el período.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pagos a fecha DTE</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Facturado (DTE)</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Diferencia</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conciliacion.map((c) => (
                  <tr key={c.fecha}>
                    <td className="px-4 py-2 text-sm">{c.fecha}</td>
                    <td className="px-4 py-2 text-sm">${Number(c.pagos).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">${Number(c.facturado).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-semibold">${Number(c.diferencia).toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <span className={'px-2 py-1 rounded-full text-xs font-medium ' + (c.estado === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>{c.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">DTE por tipo y estado</h3>
            <button className="btn-secondary flex items-center gap-2 text-sm" onClick={exportarDteTipo}><FiDownload />CSV</button>
          </div>
          {(!dte || !dte.porTipo || dte.porTipo.length === 0) ? <p className="text-sm text-gray-500">Sin DTEs emitidos.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dte.porTipo.map((t, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-sm font-medium">{t.dte_type}</td>
                      <td className="px-4 py-2 text-sm">{t.transmission_status}</td>
                      <td className="px-4 py-2 text-sm">{t.total}</td>
                      <td className="px-4 py-2 text-sm">${Number(t.monto).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">Bitácora de transmisiones DTE (últimas 100)</h3>
            <button className="btn-secondary flex items-center gap-2 text-sm" onClick={exportarBitacora}><FiDownload />CSV</button>
          </div>
          {(!dte || !dte.bitacora || dte.bitacora.length === 0) ? <p className="text-sm text-gray-500">Sin transmisiones.</p> : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">N° control</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Sello</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dte.bitacora.map((b) => (
                    <tr key={b.id}>
                      <td className="px-4 py-2 text-xs font-mono">{b.control_number}</td>
                      <td className="px-4 py-2 text-sm">{b.dte_type}</td>
                      <td className="px-4 py-2 text-sm">{b.transmission_status}</td>
                      <td className="px-4 py-2 text-xs text-gray-500">{b.reception_seal || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reportes;
