import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiSend, FiCalendar, FiFileText, FiFileMinus, FiCpu, FiUsers,
  FiBarChart2, FiLogOut, FiUserPlus, FiMap, FiUser, FiShield, FiCreditCard,
  FiAlertTriangle, FiUserCheck, FiMail, FiShoppingBag, FiSettings,
  FiBell,
} from 'react-icons/fi';
import { canAccessPage, roleOf, ROLE_DEFINITIONS } from '../utils/roles';

const Sidebar = () => {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const rol = roleOf(usuario);

  const menu = [
    {
      seccion: 'General',
      items: [
        { page: 'dashboard', path: '/dashboard', icon: FiHome, label: 'Dashboard' },
      ],
    },
    {
      seccion: 'Ventas y Reservas',
      items: [
        { page: 'nueva-reserva', path: '/nueva-reserva', icon: FiUserPlus, label: 'Nueva Reserva' },
        { page: 'reservas', path: '/reservas', icon: FiCalendar, label: 'Reservas' },
        { page: 'clientes', path: '/clientes', icon: FiUser, label: 'Clientes' },
        { page: 'pagos', path: '/pagos', icon: FiCreditCard, label: 'Pagos' },
        { page: 'comercial', path: '/comercial', icon: FiShoppingBag, label: 'Comercial / Waitlist' },
      ],
    },
    {
      seccion: 'Operaciones de Vuelo',
      items: [
        { page: 'vuelos', path: '/vuelos', icon: FiSend, label: 'Vuelos' },
        { page: 'aeropuertos', path: '/aeropuertos', icon: FiMap, label: 'Aeropuertos' },
        { page: 'aeronaves', path: '/aeronaves', icon: FiCpu, label: 'Aeronaves' },
        { page: 'checkin', path: '/checkin', icon: FiUserCheck, label: rol === 'operations' ? 'Manifiestos de vuelo' : 'Check-in / Embarque' },
        { page: 'operaciones', path: '/operaciones', icon: FiSettings, label: 'Operaciones' },
      ],
    },
    {
      seccion: 'Facturación y Fiscal',
      items: [
        { page: 'dte', path: '/dte', icon: FiFileText, label: 'Facturación DTE' },
        { page: 'notas', path: '/notas', icon: FiFileMinus, label: 'Notas NCE/NDE' },
        { page: 'contingencia', path: '/contingencia', icon: FiAlertTriangle, label: 'Contingencia DTE' },
        { page: 'cumplimiento', path: '/cumplimiento', icon: FiShield, label: 'Cumplimiento Fiscal' },
        { page: 'fiscalidad', path: '/fiscalidad', icon: FiSettings, label: 'Fiscalidad y tasas' },
      ],
    },
    {
      seccion: 'Administración',
      items: [
        { page: 'usuarios', path: '/usuarios', icon: FiUsers, label: 'Usuarios y accesos' },
      ],
    },
    {
      seccion: 'Análisis y Soporte',
      items: [
        { page: 'reportes', path: '/reportes', icon: FiBarChart2, label: 'Reportes' },
        { page: 'correos', path: '/correos', icon: FiMail, label: 'Correos' },
        { page: 'notificaciones', path: '/notificaciones', icon: FiBell, label: 'Notificaciones' },
        { page: 'auditoria', path: '/auditoria', icon: FiShield, label: 'Auditoría' },
      ],
    },
  ];

  const salir = async () => {
    await cerrarSesion();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col">
      <div className="min-h-20 flex flex-col items-center justify-center px-4 py-2 border-b border-gray-200">
        <div className="h-14 w-full overflow-hidden flex items-center justify-center rounded bg-[#f7f7f7]">
          <img src="/logo-acajutla-airlines.png" alt="Acajutla Airlines" className="w-full h-auto max-w-none" />
        </div>
        <p className="-mt-1 text-[10px] font-medium tracking-wide text-gray-500">BACKOFFICE</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {menu.map((grupo) => {
          const itemsPermitidos = grupo.items.filter((item) => canAccessPage(rol, item.page));
          if (!itemsPermitidos.length) return null;
          return (
            <div key={grupo.seccion} className="mb-4 last:mb-0">
              <p className="px-4 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{grupo.seccion}</p>
              <div className="space-y-1">
                {itemsPermitidos.map((item) => (
                  <NavLink key={item.path} to={item.path}
                    className={({ isActive }) =>
                      'flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
                      (isActive ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600' : 'text-gray-700 hover:bg-gray-50')
                    }>
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-semibold text-sm">{(usuario?.username || 'U')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{usuario?.username || 'Usuario'}</p>
            <p className="text-xs text-gray-500">{ROLE_DEFINITIONS[rol]?.label || 'Rol'}</p>
          </div>
        </div>
        <button onClick={salir} className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
          <FiLogOut size={16} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
