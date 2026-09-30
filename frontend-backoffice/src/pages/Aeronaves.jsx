import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiPlus, FiSearch, FiX, FiCpu, FiLayers, FiHash, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ESTADOS_AERONAVE = [
  ['available', 'Disponible / Buena condición'],
  ['in_flight', 'En vuelo'],
  ['maintenance', 'En mantenimiento'],
  ['out_of_service', 'Fuera de servicio'],
];

const Aeronaves = () => {
  const [aeronaves, setAeronaves] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modalAeronave, setModalAeronave] = useState(false);
  const [modalTipo, setModalTipo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formAeronave, setFormAeronave] = useState({ registration: '', serial_number: '', type_id: '', status: 'available', manufacture_year: '' });
  const [formTipo, setFormTipo] = useState({ model: '', manufacturer: '', total_capacity: '', active: true });
  // Drawer state
  const [drawerAeronave, setDrawerAeronave] = useState(null);
  const [estadoDrawer, setEstadoDrawer] = useState('available');
  const [tipoEditando, setTipoEditando] = useState(null);

  const cargar = () => {
    Promise.all([api.get('/aeronaves'), api.get('/aeronaves/tipos')])
      .then((res) => {
        setAeronaves(res[0].data.datos || []);
        setTipos(res[1].data.datos || []);
      })
      .catch(() => toast.error('Error al cargar datos'))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirModalAeronave = () => {
    setFormAeronave({ registration: '', serial_number: '', type_id: '', status: 'available', manufacture_year: '' });
    setModalAeronave(true);
  };

  const abrirModalTipo = () => {
    setTipoEditando(null);
    setFormTipo({ model: '', manufacturer: '', total_capacity: '', active: true });
    setModalTipo(true);
  };

  const editarTipo = (t) => {
    setTipoEditando(t);
    setFormTipo({ model: t.model, manufacturer: t.manufacturer, total_capacity: String(t.total_capacity), active: !!t.active });
    setModalTipo(true);
  };

  const guardarEstado = async () => {
    if (!drawerAeronave) return;
    setGuardando(true);
    try {
      await api.put('/aeronaves/' + drawerAeronave.id, { status: estadoDrawer });
      toast.success('Estado de la aeronave actualizado');
      setDrawerAeronave(Object.assign({}, drawerAeronave, { status: estadoDrawer }));
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al actualizar el estado');
    } finally { setGuardando(false); }
  };

  // Nada se elimina: las aeronaves se desactivan poniéndolas fuera de servicio
  // (dejan de poder asignarse a vuelos nuevos) y los tipos se activan/desactivan
  // desde el modal de edición del tipo.
  const cambiarEstadoTipo = async (t, active) => {
    try {
      const r = await api.patch('/aeronaves/tipos/' + t.id + '/estado', { active: active });
      toast.success(active ? 'Tipo de aeronave activado' : 'Tipo de aeronave desactivado');
      if (r.data.advertencia) toast.error(r.data.advertencia, { duration: 6000 });
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al cambiar el estado');
    }
  };

  const setCampoAeronave = (campo, valor) => setFormAeronave((f) => Object.assign({}, f, { [campo]: valor }));
  const setCampoTipo = (campo, valor) => setFormTipo((f) => Object.assign({}, f, { [campo]: valor }));

  const guardarAeronave = async () => {
    if (!formAeronave.registration || !formAeronave.type_id) return toast.error('Matrícula y tipo son obligatorios');
    setGuardando(true);
    try {
      await api.post('/aeronaves', formAeronave);
      toast.success('Aeronave registrada');
      setModalAeronave(false);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const guardarTipo = async () => {
    if (!formTipo.model || !formTipo.manufacturer || !formTipo.total_capacity) return toast.error('Modelo, fabricante y capacidad son obligatorios');
    setGuardando(true);
    try {
      const cuerpo = {
        model: formTipo.model,
        manufacturer: formTipo.manufacturer,
        total_capacity: Number(formTipo.total_capacity),
      };
      if (tipoEditando) {
        await api.put('/aeronaves/tipos/' + tipoEditando.id, cuerpo);
        if (!!tipoEditando.active !== formTipo.active) await cambiarEstadoTipo(tipoEditando, formTipo.active);
        else toast.success('Tipo de aeronave actualizado');
      } else {
        await api.post('/aeronaves/tipos', cuerpo);
        toast.success('Tipo de aeronave registrado');
      }
      setModalTipo(false);
      setTipoEditando(null);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const lista = aeronaves.filter((a) => JSON.stringify(a).toLowerCase().includes(filtro.toLowerCase()));

  const [paginaFlota, setPaginaFlota] = useState(1);
  const [paginaTipos, setPaginaTipos] = useState(1);
  const itemsPorPagina = 40;
  useEffect(() => { setPaginaFlota(1); }, [filtro]);
  const flotaPaginada = lista.slice((paginaFlota - 1) * itemsPorPagina, paginaFlota * itemsPorPagina);
  const totalPaginasFlota = Math.ceil(lista.length / itemsPorPagina);
  const tiposPaginados = tipos.slice((paginaTipos - 1) * itemsPorPagina, paginaTipos * itemsPorPagina);
  const totalPaginasTipos = Math.ceil(tipos.length / itemsPorPagina);

  const estadoBadge = (s) => ({
    available: 'bg-green-100 text-green-700',
    in_flight: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-orange-100 text-orange-700',
    out_of_service: 'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-700');

  // Helper component for drawer rows
  const InfoFila = ({ icon: Icon, label, value }) => (
    <div className="flex items-center py-2">
      <Icon className="text-primary-600 mr-3" />
      <span className="font-medium w-32">{label}:</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Flota y Tipos de Aeronave</h1>
          <p className="text-gray-500 mt-1">Administra la flota y los modelos disponibles</p>
        </div>
        <div className="flex space-x-2">
          <button className="btn-secondary flex items-center space-x-2" onClick={abrirModalTipo}>
            <FiLayers /><span>Nuevo Tipo</span>
          </button>
          <button className="btn-primary flex items-center space-x-2" onClick={abrirModalAeronave}>
            <FiPlus /><span>Nueva Aeronave</span>
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar matrícula, modelo, fabricante..." className="input-field pl-10" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <FiCpu className="text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-800">Flota</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Matrícula</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Modelo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fabricante</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Capacidad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Año</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No hay aeronaves registradas</td></tr>
            ) : flotaPaginada.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setDrawerAeronave(a); setEstadoDrawer(a.status || 'available'); }}>
                <td className="px-6 py-4 font-bold text-primary-700">{a.registration}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{a.model || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{a.manufacturer || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{a.total_capacity || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{a.manufacture_year || '-'}</td>
                <td className="px-6 py-4"><span className={'px-3 py-1 rounded-full text-xs font-medium ' + estadoBadge(a.status)}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPaginasFlota > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between bg-gray-50">
            <button disabled={paginaFlota === 1} onClick={() => setPaginaFlota(paginaFlota - 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-600">Página {paginaFlota} de {totalPaginasFlota}</span>
            <button disabled={paginaFlota === totalPaginasFlota} onClick={() => setPaginaFlota(paginaFlota + 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Siguiente</button>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-2">Haz clic en cualquier fila para ver detalles</p>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <FiLayers className="text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-800">Tipos de Aeronave</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Modelo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fabricante</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Capacidad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aeronaves en flota</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tipos.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">No hay tipos registrados</td></tr>
            ) : tiposPaginados.map((t) => (
              <tr key={t.id} className={'hover:bg-gray-50 cursor-pointer ' + (t.active ? '' : 'opacity-60')} onClick={() => editarTipo(t)} title="Clic para ver y editar el tipo">
                <td className="px-6 py-4 font-medium text-gray-800">{t.model}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{t.manufacturer}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{t.total_capacity} pax</td>
                <td className="px-6 py-4 text-sm text-gray-600">{t.aircraft_count}</td>
                <td className="px-6 py-4">
                  <button className={t.active ? 'text-green-700' : 'text-red-700'} onClick={(e) => { e.stopPropagation(); cambiarEstadoTipo(t, !t.active); }}>
                    {t.active ? <FiToggleRight size={22}/> : <FiToggleLeft size={22}/>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPaginasTipos > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between bg-gray-50">
            <button disabled={paginaTipos === 1} onClick={() => setPaginaTipos(paginaTipos - 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-600">Página {paginaTipos} de {totalPaginasTipos}</span>
            <button disabled={paginaTipos === totalPaginasTipos} onClick={() => setPaginaTipos(paginaTipos + 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Siguiente</button>
          </div>
        )}
      </div>

      {/* Drawer for Aeronave details */}
      {drawerAeronave && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setDrawerAeronave(null)}></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">
                  {drawerAeronave.registration?.charAt(0) || 'A'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{drawerAeronave.registration}</h3>
                  <p className="text-sm text-gray-500">Modelo: {drawerAeronave.model || '-'} </p>
                </div>
              </div>
              <button onClick={() => setDrawerAeronave(null)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <InfoFila icon={FiHash} label="Matrícula" value={drawerAeronave.registration || '-'} />
              <InfoFila icon={FiCpu} label="Modelo" value={drawerAeronave.model || '-'} />
              <InfoFila icon={FiLayers} label="Fabricante" value={drawerAeronave.manufacturer || '-'} />
              <InfoFila icon={FiLayers} label="Capacidad" value={drawerAeronave.total_capacity ? `${drawerAeronave.total_capacity} pax` : '-'} />
              <InfoFila icon={FiLayers} label="Año" value={drawerAeronave.manufacture_year || '-'} />
              <InfoFila icon={FiHash} label="Número de serie" value={drawerAeronave.serial_number || '-'} />
              <div className="flex items-center py-2">
                <FiCpu className="text-primary-600 mr-3" />
                <span className="font-medium w-32">Estado:</span>
                <select className="input-field flex-1 py-1" value={estadoDrawer} onChange={(e) => setEstadoDrawer(e.target.value)}>
                  {ESTADOS_AERONAVE.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                </select>
              </div>
              {estadoDrawer !== drawerAeronave.status && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1">
                  Hay cambios sin guardar en el estado de la aeronave.
                </p>
              )}
            </div>
            <div className="px-6 pt-5 pb-10 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button onClick={() => setDrawerAeronave(null)} className="btn-secondary">Cerrar</button>
              <button className="btn-primary" onClick={guardarEstado} disabled={guardando || estadoDrawer === drawerAeronave.status}>
                {guardando ? 'Guardando...' : 'Guardar estado'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal para nueva aeronave */}
      {modalAeronave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Nueva Aeronave</h2>
              <button onClick={() => setModalAeronave(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula *</label>
                <input className="input-field" value={formAeronave.registration} onChange={(e) => setCampoAeronave('registration', e.target.value.toUpperCase())} placeholder="YS-005" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de serie</label>
                <input className="input-field" value={formAeronave.serial_number} onChange={(e) => setCampoAeronave('serial_number', e.target.value)} placeholder="MSN12345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de aeronave *</label>
                <select className="input-field" value={formAeronave.type_id} onChange={(e) => setCampoAeronave('type_id', e.target.value)}>
                  <option value="">-- Selecciona --</option>
                  {tipos.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.manufacturer} {t.model} ({t.total_capacity} pax)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año de fabricación</label>
                <input type="number" className="input-field" value={formAeronave.manufacture_year} onChange={(e) => setCampoAeronave('manufacture_year', e.target.value)} placeholder="2020" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select className="input-field" value={formAeronave.status} onChange={(e) => setCampoAeronave('status', e.target.value)}>
                  <option value="available">Disponible / Buena condición</option>
                  <option value="in_flight">En vuelo</option>
                  <option value="maintenance">En mantenimiento</option>
                  <option value="out_of_service">Fuera de servicio</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModalAeronave(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarAeronave} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para nuevo tipo */}
      {modalTipo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{tipoEditando ? 'Editar Tipo de Aeronave' : 'Nuevo Tipo de Aeronave'}</h2>
              <button onClick={() => setModalTipo(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fabricante *</label>
                <input className="input-field" value={formTipo.manufacturer} onChange={(e) => setCampoTipo('manufacturer', e.target.value)} placeholder="Boeing" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
                <input className="input-field" value={formTipo.model} onChange={(e) => setCampoTipo('model', e.target.value)} placeholder="737 MAX 8" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad total de pasajeros *</label>
                <input type="number" className="input-field" value={formTipo.total_capacity} onChange={(e) => setCampoTipo('total_capacity', e.target.value)} placeholder="178" />
              </div>
              {tipoEditando && (
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formTipo.active} onChange={(e) => setCampoTipo('active', e.target.checked)} />
                  <span>Activo (los tipos inactivos no pueden registrarse en aeronaves nuevas)</span>
                </label>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModalTipo(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardarTipo} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Aeronaves;
