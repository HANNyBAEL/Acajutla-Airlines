import axios from 'axios';

// ConfiguraciÃ³n base de Axios
const api = axios.create({
  baseURL: '/api', // Gracias al proxy de Vite, esto va a localhost:3000/api
  timeout: 10000,
});

// Interceptor para agregar el token JWT en cada peticiÃ³n
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticaciÃ³n
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

// Endpoints de AutenticaciÃ³n
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  perfil: () => api.get('/auth/perfil'),
  logout: () => api.post('/auth/logout'),
};

export default api;
export const vuelosAPI = {
  buscar: (origen, destino, fecha) => 
    axios.get(/api/vuelos/buscar?origen=\&destino=\&fecha=\),
  detalle: (id) => axios.get(/api/vuelos/\),
};

export const reservasAPI = {
  crear: (data) => axios.post('/api/reservas', data),
  obtenerPorPNR: (pnr) => axios.get(/api/reservas/pnr/\),
  cancelar: (id) => axios.put(/api/reservas/\/cancelar),
};