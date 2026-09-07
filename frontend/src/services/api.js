import axios from 'axios';

// Configuración base de Axios
const api = axios.create({
  baseURL: '/api', // Gracias al proxy de Vite, esto va a localhost:3000/api
  timeout: 10000,
});

// Interceptor para agregar el token JWT en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bo_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Endpoints de Autenticación
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  perfil: () => api.get('/auth/perfil'),
  logout: () => api.post('/auth/logout'),
};

// Endpoints de Clientes
export const clientesAPI = {
  listar: () => api.get('/clientes'),
  buscar: (documento) => api.get(`/clientes/buscar?documento=${encodeURIComponent(documento)}`),
  crear: (data) => api.post('/clientes', data),
};

export default api;