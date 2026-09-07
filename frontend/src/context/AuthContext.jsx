import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (token) {
      cargarPerfil();
    } else {
      setCargando(false);
    }
  }, [token]);

  const cargarPerfil = async () => {
    try {
      const response = await authAPI.perfil();
      setUsuario(response.data.datos);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      cerrarSesion();
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesion = async (credenciales) => {
    const response = await authAPI.login(credenciales);
    const { token, usuario } = response.data.datos;
    localStorage.setItem('token', token);
    setToken(token);
    setUsuario(usuario);
    return usuario;
  };

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUsuario(null);
  };

  const value = {
    usuario,
    token,
    cargando,
    iniciarSesion,
    cerrarSesion,
    estaAutenticado: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};