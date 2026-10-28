import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiShield, FiRefreshCw, FiCheckCircle, FiXCircle, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Auditoria = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [filtros, setFiltros] = useState({ modulo: '', resultado: '', usuario: '' });

  const cargar = async (filtrosAplicados = filtros) => {
    setCargando(true);
    setErrorCarga('');
    try {
      const params = {};
      if (filtrosAplicados.modulo) params.modulo = filtrosAplicados.modulo;
      if (filtrosAplicados.resultado) params.resultado = filtrosAplicados.resultado;
      if (filtrosAplicados.usuario.trim()) params.usuario = filtrosAplicados.usuario.trim();
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
        <form className="grid grid-cols-1 md:grid-cols-5 gap-3" onSubmit={(e) => { e.preventDefault(); cargar(); }}>
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
          <button type="submit" className="btn-primary" disabled={cargando}>{cargando ? 'Filtrando…' : 'Filtrar'}</button>
          <button type="button" className="btn-secondary" disabled={cargando} onClick={() => { const vacios = { modulo: '', resultado: '', usuario: '' }; setFiltros(vacios); cargar(vacios); }}>Limpiar</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acción</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Módulo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Recurso</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-500">Cargando bitácora...</td></tr>
              ) : errorCarga ? (
                <tr><td colSpan="7" className="text-center py-8 text-red-600">{errorCarga}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-500">Sin eventos registrados</td></tr>
              ) : logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-600">{new Date(l.timestamp).toLocaleString('es-SV')}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{l.user_name || 'anónimo'}</td>
                  <td className="px-6 py-3 text-sm"><code className="bg-gray-100 px-2 py-1 rounded text-xs">{l.action}</code></td>
                  <td className="px-6 py-3 text-sm text-gray-600">{l.module}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{l.resource_id || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{l.ip || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={'px-3 py-1 rounded-full text-xs font-medium ' + (l.result === 'exito' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                      {l.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Auditoria;
