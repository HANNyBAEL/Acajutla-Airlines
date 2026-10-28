import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PAGE_BY_ROLE, roleOf } from '../utils/roles';

const ProtectedRoute = ({ children, roles }) => {
  const { estaAutenticado, cargando, usuario } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(roleOf(usuario))) {
    const paginaInicial = DEFAULT_PAGE_BY_ROLE[roleOf(usuario)];
    if (paginaInicial && location.pathname !== paginaInicial) {
      return <Navigate to={paginaInicial} replace />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Acceso denegado</p>
          <p className="text-sm">Tu rol no tiene acceso a esta sección. Si necesitas esta función, solicita al administrador que revise tu rol.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
