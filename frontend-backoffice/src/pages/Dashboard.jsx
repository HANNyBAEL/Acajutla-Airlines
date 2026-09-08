import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiSend, FiUsers, FiPercent, FiDollarSign, FiAlertTriangle, FiRefreshCw, FiTool } from 'react-icons/fi';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORES = { scheduled: '#3b82f6', confirmed: '#22c55e', in_progress: '#f59e0b', delayed: '#fb923c', completed: '#64748b', cancelled: '#ef4444' };
const ETIQUETAS = { scheduled: 'Programado', confirmed: 'Confirmado', in_progress: 'En curso', delayed: 'Retrasado', completed: 'Finalizado', cancelled: 'Cancelado' };

const Dashboard = () => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/reportes/dashboard')
      .then((r) => setDatos(r.data.datos))
      .catch(() => setDatos(null))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div className="p-8 text-gray-500">Cargando indicadores...</div>;
  if (!datos) return <div className="p-8 text-red-600">No se pudieron cargar los indicadores. Verifique que el backend esté corriendo.</div>;

  const vuelosHoy = datos.vuelosHoy || [];
  const totalVuelos = vuelosHoy.reduce((s, v) => s + Number(v.total), 0);
  const dte = datos.dte || {};
  const aceptados = Number(dte.aceptados || 0);
  const rechazados = Number(dte.rechazados || 0);
  const salud = aceptados + rechazados > 0 ? Math.round((aceptados / (aceptados + rechazados)) * 100) : 100;
  const colorSalud = salud >= 95 ? 'text-green-600' : salud >= 80 ? 'text-yellow-600' : 'text-red-600';
  const canales = datos.ventasPorCanal || [];
  const reembolsos = datos.reembolsos || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Indicadores operativos, comerciales y fiscales en tiempo real</p>
      </div>

      {Number(datos.contingenciaPendiente24h || 0) > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center space-x-3">
          <FiAlertTriangle size={22} />
          <p className="text-sm font-medium">CRÍTICO: {datos.contingenciaPendiente24h} DTE(s) pendientes de transmisión con más de 24 horas.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Vuelos hoy</p><p className="text-3xl font-bold">{totalVuelos}</p></div>
            <div className="bg-blue-500 text-white p-3 rounded-lg"><FiSend size={22} /></div>
          </div>
          <div className="flex flex-wrap gap-1 mt-3">
            {vuelosHoy.map((v) => (
              <span key={v.status} className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: (COLORES[v.status] || '#64748b') + '22', color: COLORES[v.status] || '#64748b' }}>
                {ETIQUETAS[v.status] || v.status}: {v.total}
              </span>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Pax últimas 24 h</p><p className="text-3xl font-bold">{datos.pax24 || 0}</p></div>
            <div className="bg-green-500 text-white p-3 rounded-lg"><FiUsers size={22} /></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Ocupación promedio hoy</p><p className="text-3xl font-bold">{Number(datos.ocupacionPromedio || 0).toFixed(1)}%</p></div>
            <div className="bg-purple-500 text-white p-3 rounded-lg"><FiPercent size={22} /></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-500">Ventas brutas hoy</p><p className="text-3xl font-bold">${Number(datos.ventasTotal || 0).toFixed(2)}</p></div>
            <div className="bg-emerald-600 text-white p-3 rounded-lg"><FiDollarSign size={22} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Distribución de vuelos hoy</h3>
          {totalVuelos === 0 ? (
            <p className="text-sm text-gray-500">Sin vuelos programados hoy.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={vuelosHoy} dataKey="total" nameKey="status" outerRadius={80} label>
                  {vuelosHoy.map((v, i) => <Cell key={i} fill={COLORES[v.status] || '#64748b'} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [val, ETIQUETAS[name] || name]} />
                <Legend formatter={(val) => ETIQUETAS[val] || val} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Salud fiscal (DTE hoy)</h3>
          <p className={'text-4xl font-bold ' + colorSalud}>{salud}%</p>
          <p className="text-sm text-gray-500 mt-1">Aceptados: {aceptados} · Rechazados: {rechazados} · Pendientes: {Number(dte.pendientes || 0)} · Contingencia: {Number(dte.contingencia || 0)}</p>
          <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
            <FiRefreshCw /><span>Reembolsos: {Number(reembolsos.procesados || 0)} procesados / {Number(reembolsos.solicitados || 0)} solicitados</span>
          </div>
          <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600">
            <FiTool /><span>Aeronaves en mantenimiento o fuera de servicio: {datos.alertasMantenimiento || 0}</span>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-3">Ventas por canal (hoy)</h3>
          {canales.length === 0 ? (
            <p className="text-sm text-gray-500">Sin ventas registradas hoy.</p>
          ) : (
            <ul className="space-y-2">
              {canales.map((c) => (
                <li key={c.canal} className="flex justify-between text-sm">
                  <span className="capitalize text-gray-600">{c.canal}</span>
                  <span className="font-semibold">${Number(c.monto).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;