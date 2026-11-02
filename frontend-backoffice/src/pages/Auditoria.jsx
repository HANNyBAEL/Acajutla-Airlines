import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { FiShield, FiRefreshCw, FiCheckCircle, FiXCircle, FiActivity, FiEye, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const leerDetalle = (detalle) => {
  if (!detalle) return {};
  if (typeof detalle === 'object') return detalle;
  try { return JSON.parse(detalle); }
  catch { return { contenido: String(detalle) }; }
};

const Auditoria = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState({ modulo: '', resultado: '', usuario: '', accion: '', recurso: '', desde: '', hasta: '' });

  const cargar = async (filtrosAplicados = filtros) => {
    setCargando(true);
    setErrorCarga('');
    try {
      const params = {};
      if (filtrosAplicados.modulo) params.modulo = filtrosAplicados.modulo;
      if (filtrosAplicados.resultado) params.resultado = filtrosAplicados.resultado;
      if (filtrosAplicados.usuario.trim()) params.usuario = filtrosAplicados.usuario.trim();
      if (filtrosAplicados.accion.trim()) params.accion = filtrosAplicados.accion.trim();
      if (filtrosAplicados.recurso.trim()) params.recurso = filtrosAplicados.recurso.trim();
      if (filtrosAplicados.desde) params.desde = filtrosAplicados.desde;
      if (filtrosAplicados.hasta) params.hasta = filtrosAplicados.hasta;
      params.limite = 200;
      const [rLogsResult, rStatsResult] = await Promise.allSettled([
        api.get('/auditoria', { params: params }),
        api.get('/auditoria/estadisticas', { params: { dias: 7 } })
      ]);
      if (rLogsResult.status === 'rejected') throw rLogsResult.reason;
      setLogs(rLogsResult.value.data.datos || []);
      if (rStatsResult.status === 'fulfilled') setStats(rStatsResult.value.data.datos || null);
      else console.error('Error al cargar estadísticas de auditoría:', rStatsResult.reason);
    } catch (e) {
      console.error('Error al cargar auditoría:', e);
      const mensaje = e.response?.data?.error || 'Error al cargar la bitácora';
      setLogs([]);
      setErrorCarga(mensaje);
      toast.error(mensaje);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    api.get('/auditoria/modulos')
      .then((response) => setModulos(response.data.datos || []))
      .catch((error) => console.error('Error al cargar módulos de auditoría:', error));
  }, []);

  const t = stats && stats.totales ? stats.totales : { total: 0, exitos: 0, fallos: 0, usuarios_activos: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Bitácora de Auditoría</h1>
          <p className="text-gray-500 mt-1">Trazabilidad de acciones críticas (RNF-006)</p>
        </div>
        <button className="btn-secondary flex items-center space-x-2" onClick={cargar}>
          <FiRefreshCw /><span>Actualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center space-x-3">
          <FiActivity className="text-primary-600" size={24} />
          <div><p className="text-sm text-gray-500">Eventos (7 días)</p><p className="text-2xl font-bold">{t.total}</p></div>
        </div>
        <div className="card p-4 flex items-center space-x-3">
          <FiCheckCircle className="text-green-600" size={24} />
          <div><p className="text-sm text-gray-500">Exitosos</p><p className="text-2xl font-bold text-green-700">{t.exitos}</p></div>
        </div>
        <div className="card p-4 flex items-center space-x-3">
          <FiXCircle className="text-red-600" size={24} />
          <div><p className="text-sm text-gray-500">Fallidos</p><p className="text-2xl font-bold text-red-700">{t.fallos}</p></div>
        </div>
        <div className="card p-4 flex items-center space-x-3">
          <FiShield className="text-purple-600" size={24} />
          <div><p className="text-sm text-gray-500">Usuarios activos</p><p className="text-2xl font-bold">{t.usuarios_activos}</p></div>
        </div>
      </div>

      <div className="card p-4">
        <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3" onSubmit={(e) => { e.preventDefault(); cargar(); }}>
          <select className="input-field" value={filtros.modulo} onChange={(e) => setFiltros(Object.assign({}, filtros, { modulo: e.target.value }))}>
            <option value="">Todos los módulos</option>
            {modulos.map((modulo) => <option key={modulo} value={modulo}>{modulo}</option>)}
          </select>
          <select className="input-field" value={filtros.resultado} onChange={(e) => setFiltros(Object.assign({}, filtros, { resultado: e.target.value }))}>
            <option value="">Todos los resultados</option>
            <option value="exito">Éxito</option>
            <option value="fallo">Fallo</option>
          </select>
          <input type="search" className="input-field" placeholder="Buscar usuario..." value={filtros.usuario} onChange={(e) => setFiltros(Object.assign({}, filtros, { usuario: e.target.value }))} />
          <input type="search" className="input-field" placeholder="Buscar acción..." value={filtros.accion} onChange={(e) => setFiltros(Object.assign({}, filtros, { accion: e.target.value }))} />
          <input type="search" className="input-field" placeholder="Buscar recurso o ID..." value={filtros.recurso} onChange={(e) => setFiltros(Object.assign({}, filtros, { recurso: e.target.value }))} />
          <label className="text-xs text-gray-500">Desde<input type="date" className="input-field mt-1" value={filtros.desde} onChange={(e) => setFiltros(Object.assign({}, filtros, { desde: e.target.value }))} /></label>
          <label className="text-xs text-gray-500">Hasta<input type="date" className="input-field mt-1" value={filtros.hasta} onChange={(e) => setFiltros(Object.assign({}, filtros, { hasta: e.target.value }))} /></label>
          <button type="submit" className="btn-primary" disabled={cargando}>{cargando ? 'Filtrando…' : 'Filtrar'}</button>
          <button type="button" className="btn-secondary" disabled={cargando} onClick={() => { const vacios = { modulo: '', resultado: '', usuario: '', accion: '', recurso: '', desde: '', hasta: '' }; setFiltros(vacios); cargar(vacios); }}>Limpiar</button>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Usuarios con más actividad · últimos 7 días</h2>
        {stats?.porUsuario?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stats.porUsuario.slice(0, 5).map((usuario) => (
              <button type="button" key={`${usuario.user_id || 'anonimo'}-${usuario.user_name}`} onClick={() => { const nuevos = Object.assign({}, filtros, { usuario: usuario.user_name || '' }); setFiltros(nuevos); cargar(nuevos); }} className="rounded-lg border border-gray-200 p-3 text-left hover:border-primary-300 hover:bg-primary-50">
                <span className="block truncate font-medium text-gray-800">{usuario.user_name || 'anónimo'}</span>
                <span className="block text-sm text-gray-500">{usuario.total} eventos · {usuario.fallos || 0} fallos</span>
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">Aún no hay actividad registrada en este período.</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Módulo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Recurso</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Resultado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500">Cargando bitácora...</td></tr>
              ) : errorCarga ? (
                <tr><td colSpan="9" className="text-center py-8 text-red-600">{errorCarga}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500">Sin eventos registrados</td></tr>
              ) : logs.map((l) => {
                const detalle = leerDetalle(l.details);
                return (
                  <tr
                    key={l.id}
                    onClick={() => setDetalleSeleccionado(l)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                  <td className="px-6 py-3 text-sm text-gray-600">{new Date(l.timestamp).toLocaleString('es-SV')}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{l.user_name || 'anónimo'}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{detalle.usuario?.rol || l.usuario_rol || '—'}</td>
                  <td className="px-6 py-3 text-sm"><code className="bg-gray-100 px-2 py-1 rounded text-xs">{l.action}</code></td>
                  <td className="px-6 py-3 text-sm text-gray-600">{l.module}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{l.resource_id || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{l.ip || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={'px-3 py-1 rounded-full text-xs font-medium ' + (l.result === 'exito' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                      {l.result}
                    </span>
                  </td>
                  <td className="px-6 py-3"><button type="button" onClick={(e) => { e.stopPropagation(); setDetalleSeleccionado(l); }} className="btn-secondary py-1 px-2 text-xs"><FiEye className="inline mr-1" />Ver</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detalleSeleccionado && createPortal((() => {
        const detalle = leerDetalle(detalleSeleccionado.details);
        const eventoCompleto = Object.assign({}, detalleSeleccionado, { details: detalle });
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black bg-opacity-50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetalleSeleccionado(null); }}>
            <div className="my-auto flex max-h-[calc(100vh-2rem)] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-evento">
              <div className="flex shrink-0 items-center justify-between gap-4 border-b p-5">
                <div className="min-w-0"><h2 id="titulo-detalle-evento" className="text-xl font-bold text-gray-800">Detalle del evento</h2><p className="break-words text-sm text-gray-500">{detalleSeleccionado.action} · {new Date(detalleSeleccionado.timestamp).toLocaleString('es-SV')}</p></div>
                <button type="button" aria-label="Cerrar detalle" onClick={() => setDetalleSeleccionado(null)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Usuario / rol</p><p className="font-medium">{detalleSeleccionado.user_name || 'anónimo'} · {detalle.usuario?.rol || detalleSeleccionado.usuario_rol || '—'}</p><p className="mt-1 break-all text-xs text-gray-500">ID: {detalleSeleccionado.user_id || '—'}</p></div>
                  <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Resultado HTTP</p><p className="font-medium">{detalle.status || '—'} · {detalleSeleccionado.result}</p></div>
                  <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">IP / recurso</p><p className="break-all font-medium">{detalleSeleccionado.ip || '—'} · {detalleSeleccionado.resource_id || '—'}</p></div>
                  <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Duración</p><p className="font-medium">{detalle.duracion_ms != null ? `${detalle.duracion_ms} ms` : 'No disponible en registros antiguos'}</p></div>
                </div>
                <div className="mb-4 rounded-lg bg-gray-50 p-3"><p className="mb-1 text-xs font-semibold uppercase text-gray-500">Módulo</p><p className="text-sm">{detalleSeleccionado.module || '—'}</p></div>
                <div className="mb-4 rounded-lg bg-gray-50 p-3"><p className="mb-1 text-xs font-semibold uppercase text-gray-500">Ruta y navegador</p><p className="break-all text-sm">{detalle.metodo || '—'} {detalle.ruta || '—'}{detalle.ruta_controlador ? ` · ${detalle.ruta_controlador}` : ''}</p><p className="mt-1 break-all text-xs text-gray-500">{detalleSeleccionado.user_agent || detalle.user_agent || 'Navegador no registrado'}</p></div>
                <h3 className="mb-2 font-semibold text-gray-800">Todos los datos del evento</h3>
                <pre className="max-h-[40vh] overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">{JSON.stringify(eventoCompleto, null, 2)}</pre>
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
};

export default Auditoria;
