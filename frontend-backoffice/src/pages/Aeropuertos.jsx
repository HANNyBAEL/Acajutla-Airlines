import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiPlus, FiSearch, FiX, FiGlobe, FiMapPin, FiToggleRight, FiToggleLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { confirmarAccion } from '../utils/confirm';

const Aeropuertos = () => {
  const [aeropuertos, setAeropuertos] = useState([]);
  const [paises, setPaises] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ code: '', icao_code: '', name: '', city: '', country_id: '' });
  const [aeropuertoEditando, setAeropuertoEditando] = useState(null);
  // Drawer state
  const [drawerAeropuerto, setDrawerAeropuerto] = useState(null);

  const cargar = () => {
    api.get('/aeropuertos')
      .then((r) => setAeropuertos(r.data.datos || []))
      .catch(() => toast.error('Error al cargar aeropuertos'))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);
  useEffect(() => { api.get('/fiscalidad/paises').then((r) => setPaises(r.data.datos || [])).catch(() => {}); }, []);

  const abrirModal = () => {
    setAeropuertoEditando(null);
    setForm({ code: '', icao_code: '', name: '', city: '', country_id: '' });
    setModal(true);
  };

  const editarAeropuerto = (a) => {
    setAeropuertoEditando(a);
    setForm({
      code: a.code || '',
      icao_code: a.icao_code || '',
      name: a.name || '',
      city: a.city || '',
      country_id: a.country_id || '',
    });
    setModal(true);
  };

  const setCampo = (campo, valor) => setForm((f) => Object.assign({}, f, { [campo]: valor }));

  const guardar = async () => {
    if (!form.code || !form.name || !form.city || !form.country_id) return toast.error('Completa código, nombre, ciudad y país');
    setGuardando(true);
    try {
      if (aeropuertoEditando) {
        await api.put('/aeropuertos/' + aeropuertoEditando.id, form);
        toast.success('Aeropuerto actualizado');
      } else {
        await api.post('/aeropuertos', form);
        toast.success('Aeropuerto registrado');
      }
      setModal(false);
      setAeropuertoEditando(null);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const cambiarEstado = async (a) => {
    const mensaje = a.active
      ? `¿Desactivar el aeropuerto ${a.code}? Sus vuelos dejarán de aparecer en el buscador y en los vuelos nuevos.`
      : `¿Activar nuevamente el aeropuerto ${a.code}?`;
    const confirmado = await confirmarAccion({
      title: '¿Cambiar estado?',
      text: mensaje,
      confirmText: a.active ? 'Sí, desactivar' : 'Sí, activar',
      isDanger: a.active
    });
    if (!confirmado) return;
    try {
      const r = await api.patch(`/aeropuertos/${a.id}/estado`, { active: !a.active });
      toast.success(a.active ? 'Aeropuerto desactivado' : 'Aeropuerto activado');
      if (r.data.advertencia) toast.error(r.data.advertencia, { duration: 6000 });
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al cambiar estado');
    }
  };

  const eliminar = async (a) => {
    const confirmado = await confirmarAccion({
      title: '¿Estás seguro?',
      text: `¿Eliminar definitivamente el aeropuerto ${a.code}? Solo se permite si no tiene rutas ni historial relacionado.`,
      confirmText: 'Sí, eliminar',
      isDanger: true
    });
    if (!confirmado) return;
    try {
      await api.delete(`/aeropuertos/${a.id}`);
      toast.success('Aeropuerto eliminado');
      setDrawerAeropuerto(null);
      cargar();
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo eliminar el aeropuerto'); }
  };

  const lista = aeropuertos.filter((a) => JSON.stringify(a).toLowerCase().includes(filtro.toLowerCase()));

  const [pagina, setPagina] = useState(1);
  const itemsPorPagina = 40;
  useEffect(() => { setPagina(1); }, [filtro]);
  const aeropuertosPaginados = lista.slice((pagina - 1) * itemsPorPagina, pagina * itemsPorPagina);
  const totalPaginas = Math.ceil(lista.length / itemsPorPagina);

  const InfoFila = ({ icon: Icon, label, value }) => (
    <div className="flex items-center py-2">
      <Icon className="text-primary-600 mr-3" />
      <span className="font-medium w-36">{label}:</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Infraestructura - Aeropuertos</h1>
          <p className="text-gray-500 mt-1">Aeropuertos disponibles para rutas y vuelos</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={abrirModal}>
          <FiPlus /><span>Nuevo Aeropuerto</span>
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar aeropuerto, ciudad, país..." className="input-field pl-10" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IATA</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ciudad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">País</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">No hay aeropuertos</td></tr>
            ) : aeropuertosPaginados.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDrawerAeropuerto(a)}>
                <td className="px-6 py-4 font-bold text-primary-700">{a.code}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{a.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{a.city}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{a.country}</td>
                <td className="px-6 py-4">
                  <button className={a.active ? 'text-green-700' : 'text-red-700'} onClick={(e) => { e.stopPropagation(); cambiarEstado(a); }}>
                    {a.active ? <FiToggleRight size={22}/> : <FiToggleLeft size={22}/>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPaginas > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between bg-gray-50">
            <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Anterior</button>
            <span className="text-sm text-gray-600">Página {pagina} de {totalPaginas}</span>
            <button disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)} className="px-3 py-1 bg-white border rounded text-sm disabled:opacity-50">Siguiente</button>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-2">Haz clic en cualquier fila para ver detalles</p>
      </div>

      {/* Drawer */}
      {drawerAeropuerto && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setDrawerAeropuerto(null)}></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">
                  {drawerAeropuerto.code?.charAt(0) || 'A'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{drawerAeropuerto.code}</h3>
                  <p className="text-sm text-gray-500">{drawerAeropuerto.name}</p>
                </div>
              </div>
              <button onClick={() => setDrawerAeropuerto(null)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <InfoFila icon={FiGlobe} label="IATA" value={drawerAeropuerto.code || '-'} />
              <InfoFila icon={FiGlobe} label="OACI" value={drawerAeropuerto.icao_code || '-'} />
              <InfoFila icon={FiMapPin} label="Nombre" value={drawerAeropuerto.name || '-'} />
              <InfoFila icon={FiMapPin} label="Ciudad" value={drawerAeropuerto.city || '-'} />
              <InfoFila icon={FiMapPin} label="País" value={drawerAeropuerto.country || '-'} />
              <InfoFila icon={FiMapPin} label="Código país" value={drawerAeropuerto.country_code || '-'} />
              <InfoFila icon={FiToggleRight} label="Estado" value={drawerAeropuerto.active ? 'Activo' : 'Inactivo'} />
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 grid grid-cols-2 gap-4">
              <button onClick={() => { const a = drawerAeropuerto; setDrawerAeropuerto(null); cambiarEstado(a); }} className="btn-secondary w-full">
                {drawerAeropuerto.active ? 'Desactivar' : 'Activar'}
              </button>
              <button onClick={() => { const a = drawerAeropuerto; setDrawerAeropuerto(null); editarAeropuerto(a); }} className="btn-primary w-full">
                Editar aeropuerto
              </button>
              <button onClick={() => eliminar(drawerAeropuerto)} disabled={Number(drawerAeropuerto.route_count) > 0} title={Number(drawerAeropuerto.route_count) ? 'Tiene historial de rutas' : 'Eliminar aeropuerto'} className="btn-secondary w-full text-red-700 disabled:cursor-not-allowed disabled:opacity-50">Eliminar</button>
              <button onClick={() => setDrawerAeropuerto(null)} className="btn-secondary w-full">Cerrar</button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{aeropuertoEditando ? 'Editar Aeropuerto' : 'Registrar Aeropuerto'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código IATA (3 letras) *</label>
                <input className="input-field" maxLength={3} value={form.code} onChange={(e) => setCampo('code', e.target.value.toUpperCase())} placeholder="SAL" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código OACI (4 letras)</label>
                <input className="input-field" maxLength={4} value={form.icao_code} onChange={(e) => setCampo('icao_code', e.target.value.toUpperCase())} placeholder="MSLP" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del aeropuerto *</label>
                <input className="input-field" value={form.name} onChange={(e) => setCampo('name', e.target.value)} placeholder="Aeropuerto Internacional..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                <input className="input-field" value={form.city} onChange={(e) => setCampo('city', e.target.value)} placeholder="San Salvador" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
                <select className="input-field" value={form.country_id} onChange={(e) => setCampo('country_id', e.target.value)}><option value="">Seleccionar país</option>{paises.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}</select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : aeropuertoEditando ? 'Guardar cambios' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Aeropuertos;

