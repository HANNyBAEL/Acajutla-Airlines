import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiPlus, FiSearch, FiX, FiUser, FiMail, FiPhone, FiFileText, FiCalendar, FiHash } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { confirmarAccion } from '../utils/confirm';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [form, setForm] = useState({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', birth_date: '', email: '', phone: '' });
  // Drawer state
  const [drawerCliente, setDrawerCliente] = useState(null);

  const cargar = () => {
    api.get('/clientes')
      .then((r) => setClientes(r.data.datos || []))
      .catch(() => toast.error('Error al cargar clientes'))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const abrirModal = () => {
    setForm({ first_names: '', last_names: '', document_type: 'DUI', document_number: '', birth_date: '', email: '', phone: '' });
    setClienteEditando(null);
    setModal(true);
  };

  const editar = (cliente) => {
    setClienteEditando(cliente);
    setForm({
      first_names: cliente.first_names || '',
      last_names: cliente.last_names || '',
      document_type: cliente.document_type || 'DUI',
      document_number: cliente.document_number || '',
      birth_date: cliente.birth_date ? String(cliente.birth_date).slice(0, 10) : '',
      email: cliente.email || '',
      phone: cliente.phone || ''
    });
    setModal(true);
  };

  const setCampo = (campo, valor) => setForm((f) => Object.assign({}, f, { [campo]: valor }));

  const guardar = async () => {
    if (!form.first_names || !form.last_names || !form.birth_date) return toast.error('Nombres, apellidos y fecha de nacimiento son obligatorios');
    setGuardando(true);
    try {
      if (clienteEditando) {
        await api.put('/clientes/' + clienteEditando.id, form);
        toast.success('Cliente actualizado');
      } else {
        await api.post('/clientes', form);
        toast.success('Cliente registrado');
      }
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al guardar');
    } finally { setGuardando(false); }
  };

  const eliminar = async (cliente) => {
    const confirmado = await confirmarAccion({
      title: '¿Estás seguro?',
      text: `¿Eliminar definitivamente a ${cliente.first_names} ${cliente.last_names}? Solo se permite si no tiene reservas ni historial relacionado.`,
      confirmText: 'Sí, eliminar',
      isDanger: true
    });
    if (!confirmado) return;
    try {
      await api.delete('/clientes/' + cliente.id);
      toast.success('Cliente eliminado');
      setDrawerCliente(null);
      cargar();
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudo eliminar el cliente'); }
  };

  const lista = clientes.filter((c) => JSON.stringify(c).toLowerCase().includes(filtro.toLowerCase()));

  const InfoFila = ({ icon: Icon, label, value }) => (
    <div className="flex items-center py-2">
      <Icon className="text-primary-600 mr-3" />
      <span className="font-medium w-36">{label}:</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );

  const avatarInitials = (c) => {
    const fn = c.first_names?.[0] || '';
    const ln = c.last_names?.[0] || '';
    return `${fn}${ln}`.toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
          <p className="text-gray-500 mt-1">Base de datos de pasajeros y clientes</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={abrirModal}>
          <FiPlus /><span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por nombre, documento o email..." className="input-field pl-10" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Documento</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-500">Cargando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-8 text-gray-500">No hay clientes</td></tr>
            ) : lista.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setDrawerCliente(c)}>
                <td className="px-6 py-4 flex items-center space-x-2 w-64 max-w-xs">
                  <div className="bg-primary-600 text-white rounded-full min-w-[2rem] w-8 h-8 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {avatarInitials(c)}
                  </div>
                  <span className="font-medium text-gray-800 truncate" title={`${c.first_names} ${c.last_names}`}>{c.first_names} {c.last_names}</span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {c.document_number ? (
                    <><span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">{c.document_type}</span> <span className="ml-2">{c.document_number}</span></>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.email || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.phone || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-gray-500 mt-2">Haz clic en cualquier fila para ver detalles</p>
      </div>

      {/* Drawer */}
      {drawerCliente && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-40 z-40" onClick={() => setDrawerCliente(null)}></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold">
                  {avatarInitials(drawerCliente)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{drawerCliente.first_names} {drawerCliente.last_names}</h3>
                  <p className="text-sm text-gray-500">{drawerCliente.document_type} {drawerCliente.document_number}</p>
                </div>
              </div>
              <button onClick={() => setDrawerCliente(null)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <InfoFila icon={FiUser} label="Nombre" value={`${drawerCliente.first_names} ${drawerCliente.last_names}`} />
              <InfoFila icon={FiFileText} label="Documento" value={`${drawerCliente.document_type} ${drawerCliente.document_number}`} />
              <InfoFila icon={FiCalendar} label="Fecha de nacimiento" value={drawerCliente.birth_date ? String(drawerCliente.birth_date).slice(0,10) : '-'} />
              <InfoFila icon={FiMail} label="Email" value={drawerCliente.email || '-'} />
              <InfoFila icon={FiPhone} label="Teléfono" value={drawerCliente.phone || '-'} />
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 grid grid-cols-2 gap-4">
              <button onClick={() => { setDrawerCliente(null); editar(drawerCliente); }} className="btn-primary w-full">Editar cliente</button>
              <button onClick={() => eliminar(drawerCliente)} disabled={Number(drawerCliente.reservation_count) > 0} title={Number(drawerCliente.reservation_count) ? 'Tiene historial de reservas' : 'Eliminar cliente'} className="btn-secondary w-full text-red-700 disabled:cursor-not-allowed disabled:opacity-50">Eliminar</button>
              <button onClick={() => setDrawerCliente(null)} className="btn-secondary w-full col-span-2">Cerrar</button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">{clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input className="input-field" value={form.first_names} onChange={(e) => setCampo('first_names', e.target.value)} placeholder="Juan Carlos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input className="input-field" value={form.last_names} onChange={(e) => setCampo('last_names', e.target.value)} placeholder="Menjívar López" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                <select className="input-field" value={form.document_type} onChange={(e) => setCampo('document_type', e.target.value)}>
                  <option value="DUI">DUI</option>
                  <option value="NIT">NIT</option>
                  <option value="Passport">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento</label>
                <input className="input-field" value={form.document_number} onChange={(e) => setCampo('document_number', e.target.value)} placeholder="12345678-9" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento *</label>
                <input type="date" className="input-field" value={form.birth_date} max={new Date().toISOString().slice(0,10)} onChange={(e) => setCampo('birth_date', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={(e) => setCampo('email', e.target.value)} placeholder="cliente@email.com" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input className="input-field" value={form.phone} onChange={(e) => setCampo('phone', e.target.value)} placeholder="+503 7000-0000" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : clienteEditando ? 'Guardar cambios' : 'Crear Cliente'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;

