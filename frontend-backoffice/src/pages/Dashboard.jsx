import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { roleOf } from '../utils/roles';
import {
  FiActivity,
  FiAlertTriangle,
  FiDollarSign,
  FiRefreshCw,
  FiSend,
  FiTool,
  FiUsers,
  FiPercent,
} from 'react-icons/fi';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORES = {
  scheduled: '#2563eb',
  confirmed: '#16a34a',
  in_progress: '#d97706',
  delayed: '#ea580c',
  completed: '#64748b',
  cancelled: '#dc2626',
};

const ETIQUETAS = {
  scheduled: 'Programados',
  confirmed: 'Confirmados',
  in_progress: 'En curso',
  delayed: 'Retrasados',
  completed: 'Finalizados',
  cancelled: 'Cancelados',
};

const formatearMoneda = (valor) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(Number(valor) || 0);

const TarjetaIndicador = ({ icono: Icono, etiqueta, valor, color, detalle }) => (
  <article className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
    <div className={`absolute inset-x-0 top-0 h-1 ${color.barra}`} />
    <div className="flex min-h-[76px] items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{etiqueta}</p>
        <p className="mt-2 truncate text-3xl font-bold tracking-tight text-slate-900">{valor}</p>
      </div>
      <div className={`shrink-0 rounded-xl p-3 ${color.icono}`}>
        <Icono size={21} aria-hidden="true" />
      </div>
    </div>
    {detalle && <div className="mt-3 min-h-6">{detalle}</div>}
  </article>
);

const Dashboard = () => {
  const { usuario } = useAuth();
  const rol = roleOf(usuario);
  const esOperaciones = rol === 'operations';
  const soloOperativo = esOperaciones || rol === 'cashier';
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [actualizadoEn, setActualizadoEn] = useState(null);

  const cargarDatos = async (inicial = false) => {
    if (inicial) setCargando(true);
    else setActualizando(true);

    try {
      const respuesta = await api.get('/reportes/dashboard');
      setDatos(respuesta.data.datos);
      setActualizadoEn(new Date());
      setErrorCarga('');
    } catch {
      setErrorCarga('No se pudieron cargar los indicadores. Verifique su conexión e inténtelo de nuevo.');
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarDatos(true);
  }, []);

  if (cargando) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />)}
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />)}
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><FiAlertTriangle size={22} /></div>
        <h1 className="text-xl font-bold text-slate-900">No se pudo cargar el dashboard</h1>
        <p className="mt-2 text-sm text-slate-500">{errorCarga || 'Verifique su conexión e inténtelo de nuevo.'}</p>
        <button type="button" className="btn-primary mt-5 inline-flex items-center gap-2" onClick={() => cargarDatos(false)} disabled={actualizando}>
          <FiRefreshCw className={actualizando ? 'animate-spin' : ''} /> Reintentar
        </button>
      </div>
    );
  }

  const vuelosHoy = datos.vuelosHoy || [];
  const totalVuelos = vuelosHoy.reduce((suma, vuelo) => suma + Number(vuelo.total || 0), 0);
  const dte = datos.dte || {};
  const aceptados = Number(dte.aceptados || 0);
  const rechazados = Number(dte.rechazados || 0);
  const pendientes = Number(dte.pendientes || 0);
  const contingencia = Number(dte.contingencia || 0);
  const salud = aceptados + rechazados > 0 ? Math.round((aceptados / (aceptados + rechazados)) * 100) : 100;
  const colorSalud = salud >= 95 ? 'text-emerald-600' : salud >= 80 ? 'text-amber-600' : 'text-red-600';
  const canales = datos.ventasPorCanal || [];
  const maxCanal = Math.max(...canales.map((canal) => Number(canal.monto || 0)), 0);
  const reembolsos = datos.reembolsos || {};
  const colorIndicadores = {
    vuelos: { barra: 'bg-blue-600', icono: 'bg-blue-50 text-blue-700' },
    pasajeros: { barra: 'bg-emerald-600', icono: 'bg-emerald-50 text-emerald-700' },
    ocupacion: { barra: 'bg-violet-600', icono: 'bg-violet-50 text-violet-700' },
    ventas: { barra: 'bg-teal-600', icono: 'bg-teal-50 text-teal-700' },
  };

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
            <FiActivity size={15} /> Centro de control
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {soloOperativo ? 'Resumen de la operación y actividad de hoy.' : 'Resumen de operaciones, ventas y salud fiscal de hoy.'}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <p className="text-right text-xs text-slate-500">
            <span className="block font-semibold text-slate-700">{new Date().toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            {actualizadoEn && <span>Actualizado {actualizadoEn.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => cargarDatos(false)} disabled={actualizando}>
            <FiRefreshCw className={actualizando ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </header>

      {errorCarga && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          <FiAlertTriangle className="shrink-0" />
          <span>{errorCarga} Se muestran los últimos datos disponibles.</span>
        </div>
      )}

      {!soloOperativo && Number(datos.contingenciaPendiente24h || 0) > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <FiAlertTriangle className="shrink-0" size={20} />
          <p>Atención: {datos.contingenciaPendiente24h} DTE(s) pendientes de transmisión por más de 24 horas.</p>
        </div>
      )}

      <section className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${soloOperativo ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`} aria-label="Indicadores de hoy">
        <TarjetaIndicador
          icono={FiSend}
          etiqueta="Vuelos de hoy"
          valor={totalVuelos}
          color={colorIndicadores.vuelos}
          detalle={vuelosHoy.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {vuelosHoy.map((vuelo) => (
                <span key={vuelo.status} className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${COLORES[vuelo.status] || '#64748b'}15`, color: COLORES[vuelo.status] || '#64748b' }}>
                  {ETIQUETAS[vuelo.status] || vuelo.status}: {vuelo.total}
                </span>
              ))}
            </div>
          )}
        />
        <TarjetaIndicador icono={FiUsers} etiqueta="Pasajeros · últimas 24 h" valor={datos.pax24 || 0} color={colorIndicadores.pasajeros} />
        <TarjetaIndicador icono={FiPercent} etiqueta="Ocupación promedio" valor={`${Number(datos.ocupacionPromedio || 0).toFixed(1)}%`} color={colorIndicadores.ocupacion} />
        {!soloOperativo && (
          <TarjetaIndicador
            icono={FiDollarSign}
            etiqueta="Ventas brutas de hoy"
            valor={formatearMoneda(datos.ventasTotal)}
            color={colorIndicadores.ventas}
            detalle={<p className="text-xs font-medium text-slate-500">Reembolsos: <span className="text-rose-600">−{formatearMoneda(reembolsos.montoHoy)}</span></p>}
          />
        )}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12" aria-label="Desglose de actividad">
        <article className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${soloOperativo ? 'xl:col-span-7' : 'xl:col-span-5'}`}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Estado de los vuelos</h2>
              <p className="mt-1 text-sm text-slate-500">Distribución de vuelos programados para hoy</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Hoy</span>
          </div>
          {totalVuelos === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
              <FiSend className="mb-2 text-slate-400" size={25} />
              <p className="text-sm font-medium text-slate-700">Sin vuelos para hoy</p>
              <p className="mt-1 text-xs text-slate-500">Aquí aparecerá su distribución cuando existan vuelos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(180px,0.9fr)_1.1fr]">
              <div className="relative h-[210px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={vuelosHoy} dataKey="total" nameKey="status" innerRadius={59} outerRadius={82} paddingAngle={3} stroke="none">
                      {vuelosHoy.map((vuelo, indice) => <Cell key={`${vuelo.status}-${indice}`} fill={COLORES[vuelo.status] || '#64748b'} />)}
                    </Pie>
                    <Tooltip formatter={(valor, nombre) => [valor, ETIQUETAS[nombre] || nombre]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold tracking-tight text-slate-900">{totalVuelos}</span>
                  <span className="text-xs font-medium text-slate-500">vuelos</span>
                </div>
              </div>
              <div className="space-y-3">
                {vuelosHoy.map((vuelo) => (
                  <div key={vuelo.status} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORES[vuelo.status] || '#64748b' }} />
                      <span className="truncate">{ETIQUETAS[vuelo.status] || vuelo.status}</span>
                    </span>
                    <span className="font-semibold text-slate-900">{vuelo.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        {!soloOperativo && (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Salud fiscal</h2>
                <p className="mt-1 text-sm text-slate-500">Documentos electrónicos de hoy</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">DTE</span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <p className={`text-4xl font-bold tracking-tight ${colorSalud}`}>{salud}%</p>
              <p className="pb-1 text-xs text-slate-500">de documentos aceptados</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${salud >= 95 ? 'bg-emerald-500' : salud >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${salud}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                { label: 'Aceptados', value: aceptados, color: 'text-emerald-700' },
                { label: 'Rechazados', value: rechazados, color: 'text-rose-700' },
                { label: 'Pendientes', value: pendientes, color: 'text-amber-700' },
                { label: 'Contingencia', value: contingencia, color: 'text-slate-700' },
              ].map((dato) => (
                <div key={dato.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-xs text-slate-500">{dato.label}</p>
                  <p className={`mt-0.5 text-lg font-bold ${dato.color}`}>{dato.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
              <p className="flex items-start gap-2"><FiRefreshCw className="mt-0.5 shrink-0" /><span>Reembolsos: <strong>{Number(reembolsos.procesados || 0)}</strong> procesados de <strong>{Number(reembolsos.solicitados || 0)}</strong></span></p>
              <p className="flex items-start gap-2"><FiTool className="mt-0.5 shrink-0" /><span>Aeronaves en mantenimiento o fuera de servicio: <strong>{datos.alertasMantenimiento || 0}</strong></span></p>
            </div>
          </article>
        )}

        {esOperaciones && (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Mantenimiento</h2>
                <p className="mt-1 text-sm text-slate-500">Disponibilidad de aeronaves</p>
              </div>
              <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><FiTool size={20} /></span>
            </div>
            <p className="text-5xl font-bold tracking-tight text-slate-900">{datos.alertasMantenimiento || 0}</p>
            <p className="mt-2 text-sm text-slate-500">Aeronaves en mantenimiento o fuera de servicio</p>
            <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {Number(datos.alertasMantenimiento || 0) > 0 ? 'Revisar disponibilidad antes de asignar vuelos.' : 'Todas las aeronaves reportadas están disponibles.'}
            </div>
          </article>
        )}

        {!soloOperativo && (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">Ventas por canal</h2>
                <p className="mt-1 text-sm text-slate-500">Ingresos de hoy</p>
              </div>
              <span className="rounded-xl bg-teal-50 p-2.5 text-teal-700"><FiDollarSign size={20} /></span>
            </div>
            <p className="mb-5 text-2xl font-bold tracking-tight text-slate-900">{formatearMoneda(datos.ventasTotal)}</p>
            {canales.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aún no hay ventas registradas hoy.</div>
            ) : (
              <ul className="space-y-4">
                {canales.map((canal, indice) => {
                  const porcentaje = maxCanal > 0 ? Math.min(100, (Number(canal.monto || 0) / maxCanal) * 100) : 0;
                  const color = ['bg-blue-600', 'bg-teal-600', 'bg-violet-600', 'bg-amber-500'][indice % 4];
                  return (
                    <li key={canal.canal}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate capitalize text-slate-600">{canal.canal}</span>
                        <span className="shrink-0 font-semibold text-slate-900">{formatearMoneda(canal.monto)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${porcentaje}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
