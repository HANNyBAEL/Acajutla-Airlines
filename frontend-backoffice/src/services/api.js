import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

const RUTAS_PUBLICAS = ['/auth/login', '/auth/verificar-mfa', '/auth/refresh', '/auth/registro', '/vuelos/buscar', '/aeropuertos'];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bo_token');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
    return config;
  }
  const esPublica = RUTAS_PUBLICAS.some((p) => config.url && config.url.indexOf(p) === 0);
  if (esPublica) return config;
  if (window.location.pathname !== '/login') window.location.href = '/login';
  return new Promise(() => {});
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : 0;
    const url = error.config && error.config.url ? error.config.url : '';
    const esLogin = url.indexOf('/auth/login') === 0 || url.indexOf('/auth/verificar-mfa') === 0;
    if (status === 401 && !esLogin) {
      localStorage.removeItem('bo_token');
      if (window.location.pathname !== '/login') window.location.href = '/login';
      return new Promise(() => {});
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  verificarMFA: (data) => api.post('/auth/verificar-mfa', data),
  perfil: () => api.get('/auth/perfil'),
  logout: () => api.post('/auth/logout'),
};

export const vuelosAPI = {
  listar: (params) => api.get('/vuelos', { params: params }),
  buscar: (params) => api.get('/vuelos/buscar', { params: params }),
  obtener: (id) => api.get('/vuelos/' + id),
};

export const reservasAPI = {
  listar: (params) => api.get('/reservas', { params: params }),
  consultar: (pnr) => api.get('/reservas/' + pnr),
  crear: (data) => api.post('/reservas', data),
  cancelar: (pnr, motivo) => api.post('/reservas/' + pnr + '/cancelar', { motivo: motivo }),
};

export const dteAPI = {
  listar: (params) => api.get('/dte', { params: params }),
  emitir: (data) => api.post('/dte/emitir', data),
  obtener: (uuid) => api.get('/dte/' + uuid),
  obtenerPDF: (uuid) => api.get('/dte/' + uuid + '/pdf', { responseType: 'blob' }),
  obtenerJSON: (uuid) => api.get('/dte/' + uuid + '/json'),
  kpis: (params) => api.get('/dte/kpis', { params: params }),
};

export const correosAPI = {
  enviarDTE: (uuid, email) => api.post('/correos/dte', { uuid, email }),
};

export const pagosAPI = {
  listar: (params) => api.get('/pagos', { params: params }),
  procesar: (data) => api.post('/pagos/procesar', data),
  confirmar: (id) => api.post('/pagos/' + id + '/confirmar'),
  reembolsar: (id, data) => api.post('/pagos/' + id + '/reembolsar', data),
  kpis: (params) => api.get('/pagos/kpis', { params: params }),
};

export default api;