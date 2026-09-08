import { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FiRefreshCw, FiDownload } from 'react-icons/fi';
import toast from 'react-hot-toast';

const fmt = (d) => d.toISOString().slice(0, 10);

const Reportes = () => {
  const [desde, setDesde] = useState(fmt(new Date(Date.now() - 30 * 24 * 3600 * 1000)));
  const [hasta, setHasta] = useState(fmt(new Date()));
  const [ingresos, setIngresos] = useState(null);
  const [ocupacion, setOcupacion] = useState([]);
  const [conciliacion, setConciliacion] = useState([]);
  const [dte, setDte] = useState(null);
  const [cargando, setCargando] = useState(false);

  const cargar = () => {
    setCargando(true);
    const params = { desde: desde, hasta: hasta };
    Promise.all([
      api.get('/reportes/ingresos', { params: params }),
      api.get('/reportes/ocupacion', { params: params }),
      api.get('/reportes/conciliacion', { params: params }),
      api.get('/reportes/dte')
    ])
      .then((res) => {
        setIngresos(res[0].data.datos);
        setOcupacion(res[1].data.datos || []);
        setConciliacion(res[2].data.datos || []);
        setDte(res[3].data.datos);
      })
      .catch(() => toast.error('Error al cargar reportes'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const exportarCSV = () => {
    if (!conciliacion.length) return toast.error('No hay datos para exportar');
    const head = 'fecha,pagos_aprobados,facturado_dte,diferencia,estado';
    const lines = conciliacion.map((c) => [c.fecha, c.pagos, c.facturado, c.diferencia, c.estado].join(','));
    const blob = new Blob([head + '\n' + lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conciliacion_fiscal.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  const totales = (ingresos && ingresos.totales) || {};
  const serie = (ingresos && ingresos.serie) || [];
  const porMetodo = (ingresos && ingresos.porMetodo) || [];
  const porCanal = (ingresos && ingresos.porCanal) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reportes Estratégicos</h1>
          <p className="text-gray-500 mt-1">Ingresos, ocupación, conciliación fiscal y bitácora DTE</p>
        </div>
        <button className="btn-secondary flex items-center space-x-2" onClick={exportarCSV}>
          <FiDownload /><span>Exportar conciliación (CSV)</span>
        </button>
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
        <h3 className="font-semibold text-gray-800 mb-3">Ingresos diarios (bruto vs neto)</h3>
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
          <h3 className="font-semibold text-gray-800 mb-3">Ingresos por método de pago</h3>
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
          <h3 className="font-semibold text-gray-800 mb-3">Ingresos por canal de venta</h3>
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
        <h3 className="font-semibold text-gray-800 mb-3">Ocupación por ruta</h3>
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
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Pagos aprobados</th>
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
          <h3 className="font-semibold text-gray-800 mb-3">DTE por tipo y estado</h3>
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
          <h3 className="font-semibold text-gray-800 mb-3">Bitácora de transmisiones DTE (últimas 100)</h3>
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