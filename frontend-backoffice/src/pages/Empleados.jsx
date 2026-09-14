import { useEffect, useState } from 'react';
import api from '../services/api';
import { FiPlus, FiSearch, FiX, FiUserCheck, FiUserX, FiEdit2, FiMail, FiPhone, FiFileText, FiUser, FiBriefcase, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';

/* â”€â”€â”€ Drawer lateral de detalles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const EmpleadoDrawer = ({ empleado, onClose, onEditar, onCambiarEstado }) => {
  if (!empleado) return null;

  const estadoBadge = (s) => ({
    active:    'bg-green-100 text-green-700 border border-green-200',
    inactive:  'bg-gray-100  text-gray-700  border border-gray-200',
    suspended: 'bg-red-100   text-red-700   border border-red-200',
    blocked:   'bg-red-100   text-red-700   border border-red-200',
  }[s] || 'bg-gray-100 text-gray-700 border border-gray-200');

  const estadoLabel = (s) => ({
    active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', blocked: 'Bloqueado',
  }[s] || s);

  const rolLabel = (r) => ({
    admin: 'Administrador', operations: 'Operaciones', cashier: 'Cajero',
    airport_staff: 'Personal Aeroportuario', auditor: 'Auditor', corporate_agent: 'Agente Corporativo',
  }[r] || r);

  return (
    <>
      {/* Overlay oscuro */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel lateral */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-lg">
              {empleado.first_names?.[0]}{empleado.last_names?.[0]}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800 leading-tight">
                {empleado.first_names} {empleado.last_names}
              </h2>
              <p className="text-xs text-gray-500">{empleado.position || 'Sin cargo asignado'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FiX size={22} />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Badges de estado */}
          <div className="flex flex-wrap gap-2">
            <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + estadoBadge(empleado.emp_status || 'active')}>
              Empleado: {estadoLabel(empleado.emp_status || 'active')}
            </span>
            {empleado.user_id && (
              <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + estadoBadge(empleado.user_status)}>
                Cuenta: {estadoLabel(empleado.user_status)}
              </span>
            )}
          </div>

          {/* Informacion personal */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Datos personales</h3>
            <InfoFila icono={<FiMail />} label="Email" valor={empleado.email || 'â€”'} />
            <InfoFila icono={<FiPhone />} label="TelÃ©fono" valor={empleado.phone || 'â€”'} />
            <InfoFila
              icono={<FiFileText />}
              label="Documento"
              valor={empleado.document_number ? `${empleado.document_type} Â· ${empleado.document_number}` : 'â€”'}
            />
            <InfoFila icono={<FiBriefcase />} label="Cargo" valor={empleado.position || 'â€”'} />
          </div>

          <hr className="border-gray-100" />

          {/* Cuenta de sistema */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cuenta del sistema</h3>
            {empleado.username ? (
              <>
                <InfoFila icono={<FiUser />} label="Usuario" valor={empleado.username} />
                <InfoFila
                  icono={<FiShield />}
                  label="Rol"
                  valor={empleado.role ? rolLabel(empleado.role) : 'â€”'}
                />
              </>
            ) : (
              <p className="text-sm text-gray-400 italic">Este empleado no tiene cuenta de sistema</p>
            )}
          </div>
        </div>

        {/* Acciones al pie */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-2">
          <button
            onClick={() => { onClose(); onEditar(empleado); }}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            <FiEdit2 size={15} /><span>Editar empleado</span>
          </button>

          {empleado.user_id && (
            empleado.user_status === 'active' ? (
              <button
                onClick={() => { onCambiarEstado(empleado.user_id, 'inactive'); onClose(); }}
                className="w-full btn-secondary flex items-center justify-center space-x-2 text-red-600 hover:text-red-700"
              >
                <FiUserX size={15} /><span>Desactivar cuenta</span>
              </button>
            ) : (
              <button
                onClick={() => { onCambiarEstado(empleado.user_id, 'active'); onClose(); }}
                className="w-full btn-secondary flex items-center justify-center space-x-2 text-green-600 hover:text-green-700"
              >
                <FiUserCheck size={15} /><span>Activar cuenta</span>
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
};

/* Fila de info reutilizable */
const InfoFila = ({ icono, label, valor }) => (
  <div className="flex items-start space-x-3 py-2">
    <span className="text-gray-400 mt-0.5 flex-shrink-0">{icono}</span>
    <div className="min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 font-medium break-words">{valor}</p>
    </div>
  </div>
);

/* â”€â”€â”€ PÃ¡gina principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Empleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [drawerEmp, setDrawerEmp] = useState(null);
  const [form, setForm] = useState({
    first_names: '',
    last_names: '',
    document_type: 'DUI',
    document_number: '',
    position: '',
    email: '',
    phone: '',
    emp_status: 'active',
    username: '',
    password: '',
    role: '',
    user_status: 'active'
  });

  const cargar = () => {
    api.get('/empleados')
      .then((r) => setEmpleados(r.data.datos || []))
      .catch(() => toast.error('Error al cargar empleados'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, []);

  const abrirModalNuevo = () => {
    setEditandoId(null);
    setForm({
      first_names: '', last_names: '', document_type: 'DUI', document_number: '',
      position: '', email: '', phone: '', emp_status: 'active',
      username: '', password: '', role: '', user_status: 'active'
    });
    setModal(true);
  };

  const abrirModalEditar = (emp) => {
    setEditandoId(emp.id);
    setForm({
      first_names: emp.first_names || '',
      last_names: emp.last_names || '',
      document_type: emp.document_type || 'DUI',
      document_number: emp.document_number || '',
      position: emp.position || '',
      email: emp.email || '',
      phone: emp.phone || '',
      emp_status: emp.emp_status || 'active',
      username: emp.username || '',
      password: '',
      role: emp.role || '',
      user_status: emp.user_status || 'active'
    });
    setModal(true);
  };

  const setCampo = (campo, valor) => setForm((f) => Object.assign({}, f, { [campo]: valor }));

  const guardar = async () => {
    if (!form.first_names || !form.last_names || !form.document_number) {
      return toast.error('Nombres, apellidos y documento son obligatorios');
    }
    if (!editandoId) {
      if (form.username && (!form.password || !form.role)) {
        return toast.error('Si defines usuario, debes indicar contraseÃ±a y rol');
      }
      if (form.password && form.password.length < 6) {
        return toast.error('La contraseÃ±a debe tener al menos 6 caracteres');
      }
    } else {
      if (form.password && form.password.length < 6) {
        return toast.error('La nueva contraseÃ±a debe tener al menos 6 caracteres');
      }
    }

    setGuardando(true);
    try {
      if (editandoId) {
        await api.put('/empleados/' + editandoId, form);
        toast.success('Empleado actualizado correctamente');
      } else {
        await api.post('/empleados', form);
        toast.success('Empleado registrado correctamente');
      }
      setModal(false);
      cargar();
    } catch (e) {
      toast.error(
        e.response?.data?.error ||
        (editandoId ? 'Error al actualizar empleado' : 'Error al crear empleado')
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (userId, nuevoEstado) => {
    if (!window.confirm('Â¿Cambiar el estado de la cuenta de usuario?')) return;
    try {
      await api.patch('/empleados/' + userId + '/status', { status: nuevoEstado });
      toast.success('Estado actualizado');
      cargar();
    } catch (e) {
      toast.error('Error al cambiar estado');
    }
  };

  const lista = empleados.filter((e) =>
    JSON.stringify(e).toLowerCase().includes(filtro.toLowerCase())
  );

  const estadoBadge = (s) => ({
    active:    'bg-green-100 text-green-700',
    inactive:  'bg-gray-100  text-gray-700',
    suspended: 'bg-red-100   text-red-700',
    blocked:   'bg-red-100   text-red-700',
  }[s] || 'bg-gray-100 text-gray-700');

  const estadoLabel = (s) => ({
    active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', blocked: 'Bloqueado',
  }[s] || s);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">GestiÃ³n de Empleados</h1>
          <p className="text-gray-500 mt-1">Personal de la aerolÃ­nea y cuentas de acceso</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" onClick={abrirModalNuevo}>
          <FiPlus /><span>Nuevo Empleado</span>
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nombre, cargo, usuario..."
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Tabla compacta */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Empleado</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cargo</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Usuario</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cargando ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">Cargando empleados...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-8 text-gray-500">No hay empleados registrados</td></tr>
            ) : lista.map((e) => (
              <tr
                key={e.id}
                className="hover:bg-primary-50 cursor-pointer transition-colors"
                onClick={() => setDrawerEmp(e)}
              >
                {/* Nombre + avatar */}
                <td className="px-5 py-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {e.first_names?.[0]}{e.last_names?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">
                        {e.first_names} {e.last_names}
                      </p>
                      {e.email && (
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">{e.email}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Cargo */}
                <td className="px-5 py-3">
                  <span className="text-sm text-gray-600 truncate max-w-[120px] block">
                    {e.position || <span className="text-gray-400 italic">â€”</span>}
                  </span>
                </td>

                {/* Usuario */}
                <td className="px-5 py-3">
                  {e.username
                    ? <span className="text-sm font-medium text-gray-800">{e.username}</span>
                    : <span className="text-xs text-gray-400 italic">Sin cuenta</span>
                  }
                </td>

                {/* Estado */}
                <td className="px-5 py-3">
                  <span className={'px-2.5 py-0.5 rounded-full text-xs font-medium ' + estadoBadge(e.emp_status || 'active')}>
                    {estadoLabel(e.emp_status || 'active')}
                  </span>
                </td>

                {/* Acciones - stopPropagation para no abrir drawer */}
                <td className="px-5 py-3" onClick={(ev) => ev.stopPropagation()}>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => abrirModalEditar(e)}
                      className="text-primary-600 hover:text-primary-800 flex items-center space-x-1 font-medium text-sm"
                      title="Editar empleado"
                    >
                      <FiEdit2 size={15} /><span>Editar</span>
                    </button>
                    {e.user_id && (
                      e.user_status === 'active' ? (
                        <button
                          onClick={() => cambiarEstado(e.user_id, 'inactive')}
                          className="text-red-500 hover:text-red-700 flex items-center space-x-1 text-sm"
                          title="Desactivar cuenta"
                        >
                          <FiUserX size={15} /><span>Desactivar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => cambiarEstado(e.user_id, 'active')}
                          className="text-green-600 hover:text-green-700 flex items-center space-x-1 text-sm"
                          title="Activar cuenta"
                        >
                          <FiUserCheck size={15} /><span>Activar</span>
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lista.length > 0 && !cargando && (
        <p className="text-xs text-gray-400 text-center -mt-2">
          Haz clic en cualquier fila para ver el detalle completo del empleado
        </p>
      )}

      {/* Drawer lateral */}
      <EmpleadoDrawer
        empleado={drawerEmp}
        onClose={() => setDrawerEmp(null)}
        onEditar={abrirModalEditar}
        onCambiarEstado={cambiarEstado}
      />

      {/* Modal nuevo / editar */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editandoId ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h2>
              <button onClick={() => setModal(false)} className="text-gray-500 hover:text-gray-700">
                <FiX size={22} />
              </button>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">Datos personales y laborales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input className="input-field" value={form.first_names} onChange={(e) => setCampo('first_names', e.target.value)} placeholder="Ej. Juan Carlos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input className="input-field" value={form.last_names} onChange={(e) => setCampo('last_names', e.target.value)} placeholder="Ej. PÃ©rez GÃ³mez" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento *</label>
                <select className="input-field" value={form.document_type} onChange={(e) => setCampo('document_type', e.target.value)}>
                  <option value="DUI">DUI</option>
                  <option value="NIT">NIT</option>
                  <option value="Passport">Pasaporte</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NÃºmero de documento *</label>
                <input className="input-field" value={form.document_number} onChange={(e) => setCampo('document_number', e.target.value)} placeholder="Ej. 12345678-9" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <input className="input-field" value={form.position} onChange={(e) => setCampo('position', e.target.value)} placeholder="Ej. Agente de Check-in, Piloto, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TelÃ©fono</label>
                <input className="input-field" value={form.phone} onChange={(e) => setCampo('phone', e.target.value)} placeholder="Ej. +503 7123-4567" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={(e) => setCampo('email', e.target.value)} placeholder="empleado@acajutlaairlines.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado de empleado</label>
                <select className="input-field" value={form.emp_status} onChange={(e) => setCampo('emp_status', e.target.value)}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mb-2">Cuenta de acceso al sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input className="input-field" value={form.username} onChange={(e) => setCampo('username', e.target.value)} placeholder="nombre.usuario" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editandoId ? 'Nueva contraseÃ±a' : 'ContraseÃ±a'}
                </label>
                <input
                  type="password" className="input-field" value={form.password}
                  onChange={(e) => setCampo('password', e.target.value)}
                  placeholder={editandoId ? '(Sin cambios si estÃ¡ vacÃ­o)' : 'MÃ­nimo 6 caracteres'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select className="input-field" value={form.role} onChange={(e) => setCampo('role', e.target.value)}>
                  <option value="">-- Sin acceso --</option>
                  <option value="admin">Administrador</option>
                  <option value="operations">Operaciones</option>
                  <option value="cashier">Cajero</option>
                  <option value="airport_staff">Personal Aeroportuario</option>
                  <option value="auditor">Auditor</option>
                  <option value="corporate_agent">Agente Corporativo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : (editandoId ? 'Guardar Cambios' : 'Crear Empleado')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Empleados;
