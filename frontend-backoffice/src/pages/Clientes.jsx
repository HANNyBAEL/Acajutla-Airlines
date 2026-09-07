import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', email: '', phone: '' });

  const cargar = () => {
    api.get('/clientes').then((r) => setClientes(r.data.datos || []))
      .catch(() => toast.error('Error al cargar clientes'))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const abrirModal = () => {
    setForm({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', email: '', phone: '' });
    setModal(true);
  };

  const setCampo = (campo, valor) => setForm((f) => Object.assign({}, f, { [campo]: valor }));

  const guardar = async () => {
    if (!form.first_names || !form.last_names || !form.document_number) return toast.error('Nombres, apellidos y documento son obligatorios');
    setGuardando(true);
    try {
      await api.post('/clientes', form);
      toast.success('Cliente registrado');
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const lista = clientes.filter((c) => JSON.stringify(c).toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h1><p className="text-gray-500 mt-1">Base de datos de pasajeros y clientes</p></div>
        <button className="btn-primary flex items-center space-x-2" onClick={abrirModal}><FiPlus /><span>Nuevo Cliente</span></button>
      </div>
      <div className="card p-4">
        <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por nombre, documento o email..." className="input-field pl-10" /></div>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full"><thead className="bg-gray-50 border-b border-gray-200"><tr>
          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Documento</th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {cargando ? <tr><td colSpan="4" className="text-center py-8 text-gray-500">Cargando...</td></tr> :
           lista.length === 0 ? <tr><td colSpan="4" className="text-center py-8 text-gray-500">No hay clientes</td></tr> :
           lista.map((c) => (<tr key={c.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 font-medium text-gray-800">{c.first_names} {c.last_names}</td>
            <td className="px-6 py-4 text-sm"><span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">{c.document_type}</span><span className="ml-2">{c.document_number}</span></td>
            <td className="px-6 py-4 text-sm text-gray-600">{c.email || '-'}</td>
            <td className="px-6 py-4 text-sm text-gray-600">{c.phone || '-'}</td>
          </tr>))}
        </tbody></table>
      </div>
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Nuevo Cliente</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input className="input-field" value={form.first_names} onChange={(e) => setCampo('first_names', e.target.value)} placeholder="Juan Carlos" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input className="input-field" value={form.last_names} onChange={(e) => setCampo('last_names', e.target.value)} placeholder="Menjívar López" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento *</label>
                <select className="input-field" value={form.document_type} onChange={(e) => setCampo('document_type', e.target.value)}>
                  <option value="DUI">DUI</option><option value="NIT">NIT</option><option value="Passport">Pasaporte</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento *</label>
                <input className="input-field" value={form.document_number} onChange={(e) => setCampo('document_number', e.target.value)} placeholder="12345678-9" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={(e) => setCampo('email', e.target.value)} placeholder="cliente@email.com" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input className="input-field" value={form.phone} onChange={(e) => setCampo('phone', e.target.value)} placeholder="+503 7000-0000" /></div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Crear Cliente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Clientes;