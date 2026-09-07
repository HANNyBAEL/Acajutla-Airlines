import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiShield, FiRefreshCw, FiCheckCircle, FiXCircle, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Auditoria = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ modulo: '', resultado: '', usuario: '' });

  const cargar = async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtros.modulo) params.modulo = filtros.modulo;
      if (filtros.resultado) params.resultado = filtros.resultado;
      if (filtros.usuario) params.usuario = filtros.usuario;
      params.limite = 200;
      const [rLogs, rStats] = await Promise.all([
        api.get('/auditoria', { params: params }),
        api.get('/auditoria/estadisticas', { params: { dias: 7 } })
      ]);
      setLogs(rLogs.data.datos || []);
      setStats(rStats.data.datos || null);
    } catch (e) {
      toast.error('Error al cargar la bitácora');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="input-field" value={filtros.modulo} onChange={(e) => setFiltros(Object.assign({}, filtros, { modulo: e.target.value }))}>
            <option value="">Todos los módulos</option>
            <option value="auth">auth</option>
            <option value="reservas">reservas</option>
            <option value="vuelos">vuelos</option>
            <option value="pagos">pagos</option>
            <option value="dte">dte</option>
            <option value="clientes">clientes</option>
          </select>
          <select className="input-field" value={filtros.resultado} onChange={(e) => setFiltros(Object.assign({}, filtros, { resultado: e.target.value }))}>
            <option value="">Todos los resultados</option>
            <option value="exito">Éxito</option>
            <option value="fallo">Fallo</option>
          </select>
          <input className="input-field" placeholder="Buscar usuario..." value={filtros.usuario} onChange={(e) => setFiltros(Object.assign({}, filtros, { usuario: e.target.value }))} />
          <button className="btn-primary" onClick={cargar}>Filtrar</button>
        </div>
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