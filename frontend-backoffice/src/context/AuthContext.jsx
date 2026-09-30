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
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // La versión anterior guardaba el token en localStorage y mantenía la
    // sesión abierta tras cerrar el navegador; se elimina al cargar.
    localStorage.removeItem('bo_token');
    const token = sessionStorage.getItem('bo_token');
    if (token) {
      cargarPerfil();
    } else {
      setCargando(false);
    }
  }, []);

  const cargarPerfil = async () => {
    try {
      const response = await authAPI.perfil();
      setUsuario(response.data.datos);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      sessionStorage.removeItem('bo_token');
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesion = async (credenciales) => {
    const response = await authAPI.login(credenciales);
    
    if (response.data.requiereMFA) {
      return response.data;
    }

    sessionStorage.setItem('bo_token', response.data.datos.accessToken);
    setUsuario(response.data.datos.usuario);
    return response.data;
  };

  const verificarMFA = async (usuarioId, codigo) => {
    const response = await authAPI.verificarMFA({ usuarioId, codigo });
    sessionStorage.setItem('bo_token', response.data.datos.accessToken);
    setUsuario(response.data.datos.usuario);
    return response.data;
  };

  const cerrarSesion = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      sessionStorage.removeItem('bo_token');
      setUsuario(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      cargando,
      iniciarSesion,
      verificarMFA,
      cerrarSesion,
      estaAutenticado: !!usuario
    }}>
      {children}
    </AuthContext.Provider>
  );
};
