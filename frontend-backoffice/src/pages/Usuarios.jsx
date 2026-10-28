import { useEffect, useMemo, useState } from 'react';
import {
  FiPlus, FiSearch, FiX, FiUsers, FiUserCheck, FiUserX, FiShield,
  FiMail, FiClock, FiEdit2, FiEye, FiEyeOff, FiToggleLeft, FiToggleRight,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { confirmarAccion } from '../utils/confirm';
import { ROLE_DEFINITIONS, ROLE_ORDER } from '../utils/roles';
import { usuariosAPI } from '../services/api';

const ESTADOS = {
  active: { label: 'Activo', clase: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactivo', clase: 'bg-gray-100 text-gray-600' },
  blocked: { label: 'Bloqueado', clase: 'bg-red-100 text-red-700' },
  suspended: { label: 'Suspendido', clase: 'bg-amber-100 text-amber-700' },
};

const KPICard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="card flex items-center gap-4 p-4">
    <div className={'rounded-xl p-3 ' + colorClass}><Icon size={22} /></div>
    <div><p className="text-sm text-gray-500">{title}</p><p className="text-2xl font-bold text-gray-800">{value}</p></div>
  </div>
);

const UsuarioDrawer = ({ usuario, actualId, onClose, onEdit, onToggleStatus }) => {
  if (!usuario) return null;
  const estado = ESTADOS[usuario.status] || ESTADOS.inactive;
  const rol = ROLE_DEFINITIONS[usuario.role];
  const ultimoAcceso = usuario.last_login ? new Date(usuario.last_login).toLocaleString('es-SV') : 'Nunca ha iniciado sesión';

  return (
    <>
      <button type="button" aria-label="Cerrar detalle" className="fixed inset-0 z-40 cursor-default bg-black/40" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-usuario">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700">{usuario.username?.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0">
              <h2 id="titulo-detalle-usuario" className="truncate font-bold text-gray-800">{usuario.username}</h2>
              <p className="truncate text-xs text-gray-500">Cuenta de usuario del sistema</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" aria-label="Cerrar"><FiX size={20} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap gap-2">
            <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + estado.clase}>{estado.label}</span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{rol?.label || usuario.role}</span>
            {usuario.mfa_required ? <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">MFA requerido</span> : null}
          </div>
          <div className="space-y-4">
            <InfoFila icono={<FiMail />} etiqueta="Correo" valor={usuario.email || '—'} />
            <InfoFila icono={<FiShield />} etiqueta="Rol y permisos" valor={rol?.responsibility || usuario.role} />
            <InfoFila icono={<FiClock />} etiqueta="Último acceso" valor={ultimoAcceso} />
            <InfoFila icono={<FiClock />} etiqueta="Cuenta creada" valor={usuario.created_at ? new Date(usuario.created_at).toLocaleDateString('es-SV') : '—'} />
            <InfoFila icono={<FiShield />} etiqueta="Autenticación multifactor" valor={usuario.mfa_enabled ? 'Configurada' : usuario.mfa_required ? 'Requerida al iniciar sesión' : 'No requerida para este rol'} />
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-200 bg-gray-50 px-6 py-5">
          <button type="button" onClick={() => { onClose(); onEdit(usuario); }} className="btn-primary flex w-full items-center justify-center gap-2"><FiEdit2 /><span>Editar usuario</span></button>
          {Number(usuario.id) !== Number(actualId) && (
            <button type="button" onClick={() => { onToggleStatus(usuario); onClose(); }} className="btn-secondary flex w-full items-center justify-center gap-2">
              {usuario.status === 'active' ? <FiUserX /> : <FiUserCheck />}
              <span>{usuario.status === 'active' ? 'Desactivar cuenta' : 'Activar cuenta'}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

const InfoFila = ({ icono, etiqueta, valor }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 shrink-0 text-gray-400">{icono}</span>
    <div className="min-w-0"><p className="text-xs text-gray-500">{etiqueta}</p><p className="break-words text-sm font-medium text-gray-800">{valor}</p></div>
  </div>
);

const Usuarios = () => {
  const { usuario: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cuentaClienteExistenteId, setCuentaClienteExistenteId] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', role: '', password: '' });

  const cargar = async () => {
    try {
      const respuesta = await usuariosAPI.listar();
      setUsuarios(respuesta.data.datos || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudieron cargar los usuarios');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => {
    setEditandoId(null);
    setCuentaClienteExistenteId(null);
    setForm({ username: '', email: '', role: '', password: '' });
    setMostrarPassword(false);
    setModal(true);
  };

  const abrirEditar = (cuenta) => {
    setEditandoId(cuenta.id);
    setCuentaClienteExistenteId(null);
    setForm({ username: cuenta.username || '', email: cuenta.email || '', role: cuenta.role || '', password: '' });
    setMostrarPassword(false);
    setModal(true);
  };

  const cambiarCampo = (campo, valor) => {
    setCuentaClienteExistenteId(null);
    setForm((actual) => ({ ...actual, [campo]: valor }));
  };

  const guardar = async () => {
    const username = form.username.trim();
    const email = form.email.trim();
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return toast.error('El usuario debe tener entre 3 y 40 caracteres válidos');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Ingrese un correo electrónico válido');
    if (!form.role) return toast.error('Seleccione un rol');
    if (!editandoId && form.password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');
    if (editandoId && form.password && form.password.length < 6) return toast.error('La nueva contraseña debe tener al menos 6 caracteres');

    setGuardando(true);
    try {
      const payload = { username, email, role: form.role, password: form.password };
      if (editandoId) {
        await usuariosAPI.actualizar(editandoId, payload);
        toast.success('Usuario actualizado');
      } else {
        await usuariosAPI.crear(payload);
        toast.success('Usuario creado');
      }
      setModal(false);
      await cargar();
    } catch (error) {
      const conversionId = error.response?.data?.conversion?.user_id;
      if (conversionId) setCuentaClienteExistenteId(conversionId);
      toast.error(error.response?.data?.error || 'No se pudo guardar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  const convertirCuentaCliente = async () => {
    if (!cuentaClienteExistenteId) return;
    const confirmado = await confirmarAccion({
      title: 'Convertir cuenta de cliente',
      text: `La cuenta existente pasará a tener el rol ${ROLE_DEFINITIONS[form.role]?.label || form.role}. Se actualizarán el nombre de usuario y la contraseña con los datos de este formulario.`,
      confirmText: 'Convertir cuenta',
      isDanger: false,
    });
    if (!confirmado) return;
    setGuardando(true);
    try {
      await usuariosAPI.actualizar(cuentaClienteExistenteId, {
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
      });
      toast.success('Cuenta convertida a usuario de backoffice');
      setCuentaClienteExistenteId(null);
      setModal(false);
      await cargar();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo convertir la cuenta');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (cuenta) => {
    const siguiente = cuenta.status === 'active' ? 'inactive' : 'active';
    const confirmado = await confirmarAccion({
      title: siguiente === 'active' ? '¿Activar usuario?' : '¿Desactivar usuario?',
      text: siguiente === 'active' ? 'Podrá iniciar sesión con esta cuenta.' : 'La cuenta no podrá iniciar sesión hasta volver a activarla.',
      confirmText: siguiente === 'active' ? 'Activar cuenta' : 'Desactivar cuenta',
      isDanger: siguiente !== 'active',
    });
    if (!confirmado) return;
    try {
      await usuariosAPI.cambiarEstado(cuenta.id, siguiente);
      toast.success('Estado actualizado');
      await cargar();
    } catch (error) {
      toast.error(error.response?.data?.error || 'No se pudo cambiar el estado');
    }
  };

  const lista = useMemo(() => {
    const consulta = filtro.trim().toLowerCase();
    return usuarios.filter((cuenta) => {
      const coincideEstado = !estadoFiltro || cuenta.status === estadoFiltro;
      const coincideTexto = !consulta || [cuenta.username, cuenta.email, cuenta.role, ROLE_DEFINITIONS[cuenta.role]?.label].filter(Boolean).join(' ').toLowerCase().includes(consulta);
      return coincideEstado && coincideTexto;
    });
  }, [usuarios, filtro, estadoFiltro]);
  const activos = usuarios.filter((cuenta) => cuenta.status === 'active').length;
  const mfa = usuarios.filter((cuenta) => cuenta.mfa_required).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Usuarios y accesos</h1>
          <p className="mt-1 text-gray-500">Administra las cuentas que pueden ingresar al sistema y sus permisos.</p>
        </div>
        <button type="button" className="btn-primary flex items-center gap-2" onClick={abrirNuevo}><FiPlus /><span>Nuevo usuario</span></button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard title="Cuentas del sistema" value={usuarios.length} icon={FiUsers} colorClass="bg-blue-100 text-blue-600" />
        <KPICard title="Activas" value={activos} icon={FiUserCheck} colorClass="bg-green-100 text-green-600" />
        <KPICard title="Con MFA requerido" value={mfa} icon={FiShield} colorClass="bg-violet-100 text-violet-600" />
      </div>

      <section className="card p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Roles de acceso</h2>
          <p className="mt-1 text-sm text-gray-500">Cada usuario ve los módulos permitidos por su rol.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <h3 className="text-sm font-semibold text-gray-800">{ROLE_DEFINITIONS[role].label}</h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{ROLE_DEFINITIONS[role].responsibility}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Buscar usuario, correo o rol..." />
        </div>
        <select className="input-field sm:max-w-48" value={estadoFiltro} onChange={(event) => setEstadoFiltro(event.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="blocked">Bloqueados</option>
          <option value="suspended">Suspendidos</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr><th className="px-5 py-3">Usuario</th><th className="px-5 py-3">Correo</th><th className="px-5 py-3">Rol</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Último acceso</th><th className="px-5 py-3 text-right">Acceso</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? <tr><td colSpan="6" className="py-10 text-center text-gray-500">Cargando usuarios...</td></tr>
                : lista.length === 0 ? <tr><td colSpan="6" className="py-10 text-center text-gray-500">{usuarios.length ? 'No hay usuarios que coincidan con la búsqueda' : 'No hay usuarios del sistema registrados'}</td></tr>
                  : lista.map((cuenta) => {
                    const estado = ESTADOS[cuenta.status] || ESTADOS.inactive;
                    const esActual = Number(cuenta.id) === Number(usuarioActual?.id);
                    return (
                      <tr key={cuenta.id} className="cursor-pointer hover:bg-blue-50/50" onClick={() => setDetalle(cuenta)}>
                        <td className="px-5 py-4"><div className="font-semibold text-gray-800">{cuenta.username}</div><div className="mt-0.5 text-xs text-gray-400">ID {cuenta.id}{esActual ? ' · Tu cuenta' : ''}</div></td>
                        <td className="px-5 py-4 text-sm text-gray-600">{cuenta.email || '—'}</td>
                        <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{ROLE_DEFINITIONS[cuenta.role]?.label || cuenta.role}</span></td>
                        <td className="px-5 py-4"><span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + estado.clase}>{estado.label}</span></td>
                        <td className="px-5 py-4 text-sm text-gray-500">{cuenta.last_login ? new Date(cuenta.last_login).toLocaleString('es-SV') : 'Nunca'}</td>
                        <td className="px-5 py-4 text-right">
                          <button type="button" className={cuenta.status === 'active' ? 'text-green-600' : 'text-gray-400'} disabled={esActual} title={esActual ? 'No puedes cambiar tu propio estado' : cuenta.status === 'active' ? 'Desactivar usuario' : 'Activar usuario'} onClick={(event) => { event.stopPropagation(); cambiarEstado(cuenta); }}>
                            {cuenta.status === 'active' ? <FiToggleRight size={25} /> : <FiToggleLeft size={25} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        {!cargando && lista.length > 0 && <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400">Selecciona una fila para ver el detalle de la cuenta.</p>}
      </div>

      <UsuarioDrawer usuario={detalle} actualId={usuarioActual?.id} onClose={() => setDetalle(null)} onEdit={abrirEditar} onToggleStatus={cambiarEstado} />

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="titulo-usuario-form">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 id="titulo-usuario-form" className="text-xl font-bold text-gray-800">{editandoId ? 'Editar usuario' : 'Crear usuario'}</h2><p className="mt-1 text-sm text-gray-500">Configura una cuenta de acceso al sistema.</p></div>
              <button type="button" onClick={() => setModal(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Cerrar"><FiX size={21} /></button>
            </div>

            <div className="space-y-4">
              <div><label className="mb-1 block text-sm font-medium text-gray-700">Nombre de usuario *</label><input autoComplete="username" className="input-field" value={form.username} onChange={(event) => cambiarCampo('username', event.target.value)} placeholder="ej. maria.garcia" /></div>
              <div><label className="mb-1 block text-sm font-medium text-gray-700">Correo electrónico *</label><input type="email" autoComplete="email" className="input-field" value={form.email} onChange={(event) => cambiarCampo('email', event.target.value)} placeholder="usuario@empresa.com" /></div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Rol *</label>
                <select className="input-field" value={form.role} onChange={(event) => cambiarCampo('role', event.target.value)}><option value="">Selecciona un rol</option>{ROLE_ORDER.map((role) => <option key={role} value={role}>{ROLE_DEFINITIONS[role].label}</option>)}</select>
                {form.role && <p className="mt-2 text-xs text-gray-500">{ROLE_DEFINITIONS[form.role].responsibility}{['admin', 'cashier'].includes(form.role) ? ' Se requerirá verificación MFA por correo.' : ''}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{editandoId ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
                <div className="relative"><input type={mostrarPassword ? 'text' : 'password'} autoComplete={editandoId ? 'new-password' : 'new-password'} className="input-field pr-11" value={form.password} onChange={(event) => cambiarCampo('password', event.target.value)} placeholder={editandoId ? 'Déjala vacía para conservarla' : 'Mínimo 6 caracteres'} /><button type="button" onClick={() => setMostrarPassword((actual) => !actual)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400" aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{mostrarPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}</button></div>
              </div>
              <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">Esta pantalla administra únicamente cuentas de acceso y roles; los datos de empleados y tripulación se gestionan por separado.</p>
              {cuentaClienteExistenteId && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">El correo ya tiene una cuenta de cliente. Puedes convertirla para conservar el correo; dejará de tener rol de cliente y usará el rol, nombre de usuario y contraseña indicados aquí.</p>}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>{cuentaClienteExistenteId && <button type="button" className="btn-secondary" disabled={guardando} onClick={convertirCuentaCliente}>{guardando ? 'Convirtiendo...' : 'Convertir cuenta existente'}</button>}<button type="button" className="btn-primary" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear usuario'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
