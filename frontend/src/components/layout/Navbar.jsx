import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { FiMenu, FiX, FiUser, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { usuario, estaAutenticado, cerrarSesion } = useAuth();
  const location = useLocation();

  const enlaces = [
    { nombre: 'Inicio', ruta: '/' },
    { nombre: 'Vuelos', ruta: '/vuelos' },
    { nombre: 'Mi Reserva', ruta: '/mi-reserva' },
    { nombre: 'Destinos', ruta: '/destinos' },
    { nombre: 'Contacto', ruta: '/contacto' },
  ];

  const esActivo = (ruta) => location.pathname === ruta;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-sky-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-800">Acajutla Airlines</h1>
              <p className="text-xs text-gray-500 -mt-1">Vuela sin límites</p>
            </div>
          </Link>

          {/* Enlaces desktop */}
          <div className="hidden md:flex items-center space-x-1">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.ruta}
                to={enlace.ruta}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  esActivo(enlace.ruta)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {enlace.nombre}
              </Link>
            ))}
          </div>

          {/* Acciones usuario */}
          <div className="hidden md:flex items-center space-x-3">
            {estaAutenticado ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <FiUser className="text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {usuario?.nombres?.split(' ')[0] || 'Usuario'}
                  </span>
                </div>
                <button
                  onClick={cerrarSesion}
                  className="btn-ghost text-sm"
                >
                  Salir
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-primary text-sm py-2 px-4">
                  Registrarse
                </Link>
              </>
            )}
          </div>

          {/* Botón menú móvil */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuAbierto(!menuAbierto)}
          >
            {menuAbierto ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Menú móvil */}
        {menuAbierto && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.ruta}
                to={enlace.ruta}
                onClick={() => setMenuAbierto(false)}
                className={`block px-4 py-3 rounded-lg font-medium ${
                  esActivo(enlace.ruta)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {enlace.nombre}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t space-y-2 px-4">
              {!estaAutenticado ? (
                <>
                  <Link to="/login" className="block btn-secondary text-center">
                    Iniciar sesión
                  </Link>
                  <Link to="/registro" className="block btn-primary text-center">
                    Registrarse
                  </Link>
                </>
              ) : (
                <button onClick={cerrarSesion} className="block w-full btn-secondary text-center">
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;