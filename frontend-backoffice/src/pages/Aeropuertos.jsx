import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiPlus, FiSearch, FiX, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Aeropuertos = () => {
  const [aeropuertos, setAeropuertos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ code: '', icao_code: '', name: '', city: '', country: '', country_code: '' });

  const cargar = () => {
    api.get('/aeropuertos')
      .then((r) => setAeropuertos(r.data.datos || []))
      .catch(() => toast.error('Error al cargar aeropuertos'))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const abrirModal = () => {
    setForm({ code: '', icao_code: '', name: '', city: '', country: '', country_code: '' });
    setModal(true);
  };

  const setCampo = (campo, valor) => setForm((f) => Object.assign({}, f, { [campo]: valor }));

  const guardar = async () => {
    if (!form.code || !form.name || !form.city || !form.country) return toast.error('Completa código, nombre, ciudad y país');
    setGuardando(true);
    try {
      await api.post('/aeropuertos', form);
      toast.success('Aeropuerto registrado');
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const cambiarEstado = async (a) => {
    const mensaje = a.active
      ? '¿Desactivar el aeropuerto ' + a.code + '? Sus vuelos dejarán de aparecer en el buscador y en los vuelos nuevos.'
      : '¿Activar nuevamente el aeropuerto ' + a.code + '?';
    if (!window.confirm(mensaje)) return;
    try {
      const r = await api.patch('/aeropuertos/' + a.id + '/estado', { active: !a.active });
      toast.success(a.active ? 'Aeropuerto desactivado' : 'Aeropuerto activado');
      if (r.data.advertencia) toast.error(r.data.advertencia, { duration: 6000 });
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al cambiar estado');
    }
  };

  const lista = aeropuertos.filter((a) => JSON.stringify(a).toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Infraestructura - Aeropuertos</h1>
          <p className="text-gray-500 mt-1">Aeropuertos disponibles para rutas y vuelos</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={abrirModal}><FiPlus /><span>Nuevo Aeropuerto</span></button>
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
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">OACI</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ciudad</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">País</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">No hay aeropuertos</td></tr>
            ) : lista.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-primary-700">{a.code}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{a.icao_code || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{a.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{a.city}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{a.country}</td>
                <td className="px-6 py-4">
                  <span className={'px-3 py-1 rounded-full text-xs font-medium ' + (a.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {a.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => cambiarEstado(a)}
                    className={'flex items-center space-x-1 ' + (a.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800')}
                  >
                    {a.active ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                    <span className="text-sm font-medium">{a.active ? 'Desactivar' : 'Activar'}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Registrar Aeropuerto</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Código IATA (3 letras) *</label>
                <input className="input-field" maxLength={3} value={form.code} onChange={(e) => setCampo('code', e.target.value.toUpperCase())} placeholder="SAL" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Código OACI (4 letras)</label>
                <input className="input-field" maxLength={4} value={form.icao_code} onChange={(e) => setCampo('icao_code', e.target.value.toUpperCase())} placeholder="MSLP" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Nombre del aeropuerto *</label>
                <input className="input-field" value={form.name} onChange={(e) => setCampo('name', e.target.value)} placeholder="Aeropuerto Internacional..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ciudad *</label>
                <input className="input-field" value={form.city} onChange={(e) => setCampo('city', e.target.value)} placeholder="San Salvador" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">País *</label>
                <input className="input-field" value={form.country} onChange={(e) => setCampo('country', e.target.value)} placeholder="El Salvador" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Código país (CAT-020)</label>
                <input className="input-field" maxLength={2} value={form.country_code} onChange={(e) => setCampo('country_code', e.target.value.toUpperCase())} placeholder="SV" /></div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Aeropuertos;