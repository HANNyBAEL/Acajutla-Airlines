import axios from 'axios';

const configuredApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
const baseURL = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bo_token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = (error.config && error.config.url) || '';
    if (error.response && error.response.status === 401 && url.indexOf('/auth/') === -1) {
      localStorage.removeItem('bo_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const auto = (base) => new Proxy({}, {
  get: (t, prop) => {
    if (typeof prop !== 'string') return undefined;
    return (...args) => {
      const a = args[0];
      const b = args[1];
      const n = prop;
      if (n.indexOf('listar') === 0 || n.indexOf('obtener') === 0 || n.indexOf('buscar') === 0 || n.indexOf('ver') === 0 || n.indexOf('get') === 0) {
        const esId = a !== undefined && typeof a !== 'object';
        const params = typeof a === 'object' && a !== null ? a : (typeof b === 'object' && b !== null ? b : undefined);
        return api.get(base + (esId ? '/' + a : ''), params ? { params: params } : undefined);
      }
      if (n.indexOf('eliminar') === 0 || n.indexOf('borrar') === 0) return api.delete(base + '/' + a);
      if (n.indexOf('actualizar') === 0 || n.indexOf('editar') === 0) return api.put(base + '/' + a, b);
      if (n === 'crear') return api.post(base, a);
      return api.post(base + '/' + n, a);
    };
  }
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  verificarMFA: (data) => api.post('/auth/verificar-mfa', data),
  verificarMfa: (data) => api.post('/auth/verificar-mfa', data),
  verifyMfa: (data) => api.post('/auth/verificar-mfa', data),
  mfa: (data) => api.post('/auth/verificar-mfa', data),
  perfil: () => api.get('/auth/perfil'),
  me: () => api.get('/auth/perfil'),
  getUser: () => api.get('/auth/perfil'),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  changePassword: (data) => api.post('/auth/cambio-password', data),
};

export const reservasAPI = {
  listar: (p) => api.get('/reservas', { params: p }),
  crear: (d) => api.post('/reservas', d),
  detalle: (id) => api.get('/reservas/' + id),
  consultar: (pnr) => api.get('/reservas/pnr/' + pnr),
  actualizar: (id, d) => api.put('/reservas/' + id, d),
  cancelar: (id, d) => api.post('/reservas/' + id + '/cancelar', d),
};

export const vuelosAPI = {
  listar: (p) => api.get('/vuelos', { params: p }),
  crear: (d) => api.post('/vuelos', d),
  actualizar: (id, d) => api.put('/vuelos/' + id, d),
  cancelar: (id, d) => api.post('/vuelos/' + id + '/cancelar', d),
  reprogramar: (id, d) => api.post('/vuelos/' + id + '/reprogramar', d),
};

export const pagosAPI = {
  listar: (p) => api.get('/pagos', { params: p }),
  procesar: (d) => api.post('/pagos/procesar', d),
  confirmar: (id, d) => api.post('/pagos/' + id + '/confirmar', d),
  reembolsar: (id, d) => api.post('/pagos/' + id + '/reembolsar', d),
};

export const dteAPI = {
  listar: (p) => api.get('/dte', { params: p }),
  emitir: (d) => api.post('/dte/emitir', d),
  detalle: (id) => api.get('/dte/' + id),
  ver: (id) => api.get('/dte/' + id),
  invalidar: (uuid, d) => api.post('/dte-eventos/invalidar/' + uuid, d),
  pendientes: () => api.get('/dte-eventos/pendientes'),
  eventos: () => api.get('/dte-eventos/eventos'),
};

export const pasajerosAPI = auto('/pasajeros');
export const clientesAPI = auto('/clientes');
export const aeropuertosAPI = auto('/aeropuertos');
export const aeronavesAPI = auto('/aeronaves');
export const empleadosAPI = auto('/empleados');
export const usuariosAPI = auto('/usuarios');
export const auditoriaAPI = { listar: (p) => api.get('/auditoria', { params: p }) };
export const reportesAPI = auto('/reportes');
export const checkinAPI = auto('/checkin');
export const correosAPI = auto('/correos');

export default api;
