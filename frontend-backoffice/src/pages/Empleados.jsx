import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiPlus, FiSearch, FiX, FiUserCheck, FiUserX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Empleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    first_names: '', last_names: '', document_type: 'DUI', document_number: '',
    position: '', email: '', phone: '', username: '', password: '', role: '',
  });

  const cargar = () => {
    api.get('/empleados').then((r) => setEmpleados(r.data.datos || []))
      .catch(() => toast.error('Error al cargar empleados'))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, []);

  const abrirModal = () => {
    setForm({
      first_names: '', last_names: '', document_type: 'DUI', document_number: '',
      position: '', email: '', phone: '', username: '', password: '', role: '',
    });
    setModal(true);
  };

  const setCampo = (campo, valor) => setForm((f) => Object.assign({}, f, { [campo]: valor }));

  const guardar = async () => {
    if (!form.first_names || !form.last_names || !form.document_number) {
      return toast.error('Nombres, apellidos y documento son obligatorios');
    }
    if (form.username && (!form.password || !form.role)) {
      return toast.error('Si defines usuario, debes indicar contraseña y rol');
    }
    if (form.password && form.password.length < 6) {
      return toast.error('La contraseña debe tener al menos 6 caracteres');
    }
    setGuardando(true);
    try {
      await api.post('/empleados', form);
      toast.success('Empleado registrado correctamente');
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(e.response && e.response.data && e.response.data.error ? e.response.data.error : 'Error al crear empleado');
    } finally { setGuardando(false); }
  };

  const cambiarEstado = async (userId, nuevoEstado) => {
    if (!window.confirm('¿Cambiar el estado de la cuenta de usuario?')) return;
    try {
      await api.patch('/empleados/' + userId + '/status', { status: nuevoEstado });
      toast.success('Estado actualizado');
      cargar();
    } catch (e) { toast.error('Error al cambiar estado'); }
  };

  const lista = empleados.filter((e) => JSON.stringify(e).toLowerCase().includes(filtro.toLowerCase()));

  const estadoBadge = (s) => ({
    active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700', blocked: 'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-700');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Empleados</h1>
          <p className="text-gray-500 mt-1">Personal de la aerolínea y cuentas de acceso</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={abrirModal}><FiPlus /><span>Nuevo Empleado</span></button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar por nombre, cargo, usuario..." className="input-field pl-10" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Empleado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cargo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Documento</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">Cargando empleados...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="7" className="text-center py-8 text-gray-500">No hay empleados registrados</td></tr>
            ) : lista.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-800">{e.first_names} {e.last_names}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{e.position || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{e.document_type} {e.document_number}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-800">{e.username || 'Sin cuenta'}</td>
                <td className="px-6 py-4">
                  {e.role ? <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium capitalize">{e.role}</span> : '-'}
                </td>
                <td className="px-6 py-4">
                  {e.user_status ? <span className={'px-3 py-1 rounded-full text-xs font-medium ' + estadoBadge(e.user_status)}>{e.user_status}</span> : '-'}
                </td>
                <td className="px-6 py-4">
                  {e.user_id ? (
                    e.user_status === 'active' ? (
                      <button onClick={() => cambiarEstado(e.user_id, 'inactive')} className="text-red-600 hover:text-red-800 flex items-center space-x-1">
                        <FiUserX size={16} /><span className="text-sm">Desactivar</span>
                      </button>
                    ) : (
                      <button onClick={() => cambiarEstado(e.user_id, 'active')} className="text-green-600 hover:text-green-800 flex items-center space-x-1">
                        <FiUserCheck size={16} /><span className="text-sm">Activar</span>
                      </button>
                    )
                  ) : <span className="text-xs text-gray-400">Sin cuenta de acceso</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Nuevo Empleado</h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-gray-700"><FiX size={22} /></button>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">Datos personales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input className="input-field" value={form.first_names} onChange={(e) => setCampo('first_names', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input className="input-field" value={form.last_names} onChange={(e) => setCampo('last_names', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento *</label>
                <select className="input-field" value={form.document_type} onChange={(e) => setCampo('document_type', e.target.value)}>
                  <option value="DUI">DUI</option><option value="NIT">NIT</option><option value="Passport">Pasaporte</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Número de documento *</label>
                <input className="input-field" value={form.document_number} onChange={(e) => setCampo('document_number', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <input className="input-field" value={form.position} onChange={(e) => setCampo('position', e.target.value)} placeholder="Agente de Check-in" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input className="input-field" value={form.phone} onChange={(e) => setCampo('phone', e.target.value)} /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={(e) => setCampo('email', e.target.value)} /></div>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">Cuenta de acceso (opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input className="input-field" value={form.username} onChange={(e) => setCampo('username', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" className="input-field" value={form.password} onChange={(e) => setCampo('password', e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select className="input-field" value={form.role} onChange={(e) => setCampo('role', e.target.value)}>
                  <option value="">-- Sin acceso --</option>
                  <option value="admin">Administrador</option>
                  <option value="operations">Operaciones</option>
                  <option value="cashier">Cajero</option>
                  <option value="airport_staff">Personal Aeroportuario</option>
                  <option value="auditor">Auditor</option>`n                  <option value="agent">Agente de Viajes/Corporativo</option>
                </select></div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Crear Empleado'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Empleados;