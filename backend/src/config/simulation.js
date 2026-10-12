// Proyecto escolar. El ambiente fiscal no es configurable a producción.
const SIMULATION = Object.freeze({ ambiente: '00', simulado: true, leyenda: 'SIMULACIÓN ESCOLAR · SIN VALIDEZ FISCAL' });

function validarDestinoHttp(input) {
  const url = input instanceof URL ? input : new URL(String(input));
  // Únicos destinos HTTP necesarios: correo Brevo y procesos locales.
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase());
  if (!['http:', 'https:'].includes(url.protocol) || (!local && !(url.protocol === 'https:' && url.hostname === 'api.brevo.com'))) {
    throw new Error('SIMULATION_NETWORK_BLOCKED: destino externo no autorizado para el proyecto escolar');
  }
  return url;
}

let instalado = false;
function protegerRed() {
  if (instalado) return;
  instalado = true;
  for (const protocol of ['http', 'https']) {
    const client = require('node:' + protocol);
    const original = client.request;
    client.request = function(input, ...args) {
      if (typeof input === 'string' || input instanceof URL) validarDestinoHttp(input);
      else {
        const host = input?.hostname || input?.host || 'localhost';
        validarDestinoHttp(`${input?.protocol || protocol + ':'}//${host}`);
        // Los proxies no deben poder reenviar una URL externa absoluta.
        if (/^https?:\/\//i.test(input?.path || '')) validarDestinoHttp(input.path);
      }
      return original.call(this, input, ...args);
    };
    client.get = function(...args) { const req = client.request(...args); req.end(); return req; };
  }
  const originalFetch = globalThis.fetch;
  if (originalFetch) globalThis.fetch = async (input, options = {}) => {
    validarDestinoHttp(input?.url || input);
    // Evita que un destino permitido redirija una solicitud fuera de la lista.
    return originalFetch(input, { ...options, redirect: 'error' });
  };
}
module.exports = { SIMULATION, validarDestinoHttp, protegerRed };
