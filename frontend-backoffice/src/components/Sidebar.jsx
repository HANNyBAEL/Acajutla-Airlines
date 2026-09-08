import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiSend, FiCalendar, FiFileText, FiFileMinus, FiCpu, FiUsers, FiBarChart2, FiLogOut, FiUserPlus, FiMap, FiUser, FiShield, FiCreditCard, FiAlertTriangle, FiUserCheck, FiMail, FiShoppingBag, FiGlobe } from 'react-icons/fi';

const Sidebar = () => {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const menu = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/clientes', icon: FiUser, label: 'Clientes' },
    { path: '/nueva-reserva', icon: FiUserPlus, label: 'Nueva Reserva' },
    { path: '/vuelos', icon: FiSend, label: 'Vuelos' },
    { path: '/aeropuertos', icon: FiMap, label: 'Aeropuertos' },
    { path: '/reservas', icon: FiCalendar, label: 'Reservas' },
    { path: '/pagos', icon: FiCreditCard, label: 'Pagos' },
    { path: '/dte', icon: FiFileText, label: 'Facturación DTE' },
    { path: '/notas', icon: FiFileMinus, label: 'Notas NCE/NDE' },
    { path: '/contingencia', icon: FiAlertTriangle, label: 'Contingencia DTE' },
    { path: '/checkin', icon: FiUserCheck, label: 'Check-in / Embarque' },
    { path: '/aeronaves', icon: FiCpu, label: 'Aeronaves' },
    { path: '/empleados', icon: FiUsers, label: 'Empleados' },
    { path: '/reportes', icon: FiBarChart2, label: 'Reportes' },
    { path: '/correos', icon: FiMail, label: 'Correos' },
    { path: '/comercial', icon: FiShoppingBag, label: 'Comercial / Waitlist' },
    { path: '/auditoria', icon: FiShield, label: 'Auditoría' },
    { path: '/dte-export', icon: FiGlobe, label: 'FEXE / FSEE' },
  ];

  const salir = async () => {
    await cerrarSesion();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
          <FiSend className="text-white" size={18} />
        </div>
        <div className="ml-2">
          <h1 className="font-bold text-gray-800 text-sm">SkyManager</h1>
          <p className="text-xs text-gray-500">Backoffice</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menu.map((item) => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) =>
              'flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
              (isActive ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600' : 'text-gray-700 hover:bg-gray-50')
            }>
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-semibold text-sm">{(usuario?.username || 'U')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{usuario?.username || 'Usuario'}</p>
            <p className="text-xs text-gray-500 capitalize">{usuario?.role || 'rol'}</p>
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
