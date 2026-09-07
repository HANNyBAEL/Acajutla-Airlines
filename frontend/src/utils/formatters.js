import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha ISO a formato legible
 */
export const formatearFecha = (fecha, formato = 'dd MMM yyyy') => {
  if (!fecha) return '';
  const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
  return format(date, formato, { locale: es });
};

/**
 * Formatea hora HH:MM
 */
export const formatearHora = (fecha) => {
  if (!fecha) return '';
  const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
  return format(date, 'HH:mm');
};

/**
 * Calcula duración entre dos fechas
 */
export const calcularDuracion = (salida, llegada) => {
  const inicio = new Date(salida);
  const fin = new Date(llegada);
  const diffMs = fin - inicio;
  
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${horas}h ${minutos}m`;
};

/**
 * Formatea moneda USD
 */
export const formatearMoneda = (monto, moneda = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);
};

/**
 * Formatea número de documento con máscara
 */
export const enmascararDocumento = (doc, tipo = 'DUI') => {
  if (!doc) return '';
  if (doc.length <= 4) return doc;
  return '•'.repeat(doc.length - 4) + doc.slice(-4);
};

/**
 * Convierte código IATA a nombre de clase
 */
export const nombreClase = (codigo) => {
  const clases = {
    economica: 'Económica',
    premium: 'Premium Economy',
    ejecutiva: 'Ejecutiva',
    primera: 'Primera Clase',
  };
  return clases[codigo?.toLowerCase()] || 'Económica';
};

/**
 * Formatea tiempo relativo
 */
export const tiempoRelativo = (fecha) => {
  if (!fecha) return '';
  const date = typeof fecha === 'string' ? parseISO(fecha) : fecha;
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
};