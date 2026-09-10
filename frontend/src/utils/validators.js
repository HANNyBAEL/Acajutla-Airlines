/**
 * Valida formato de DUI salvadoreño (9 dígitos con o sin guiones)
 */
export const validarDUI = (dui) => {
  const limpio = dui.replace(/-/g, '');
  return /^\d{9}$/.test(limpio);
};

/**
 * Valida formato de NIT
 */
export const validarNIT = (nit) => {
  const limpio = nit.replace(/-/g, '');
  return /^\d{14}$/.test(limpio) || /^\d{9}$/.test(limpio);
};

/**
 * Valida formato de pasaporte
 */
export const validarPasaporte = (pasaporte) => {
  return /^[A-Za-z0-9]{6,12}$/.test(pasaporte);
};

/**
 * Valida formato de correo electrónico
 */
export const validarEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Valida teléfono salvadoreño (8 dígitos)
 */
export const validarTelefono = (telefono) => {
  const limpio = telefono.replace(/[^0-9]/g, '');
  return /^\d{8}$/.test(limpio);
};

/**
 * Valida fecha de nacimiento (mayor de 0 años, menor de 120)
 */
export const validarFechaNacimiento = (fecha) => {
  if (!fecha) return false;
  const nacimiento = new Date(fecha);
  const hoy = new Date();
  const edad = hoy.getFullYear() - nacimiento.getFullYear();
  return edad >= 0 && edad <= 120;
};

/**
 * Valida un objeto de pasajero completo
 */
export const validarPasajero = (pasajero) => {
  const errores = {};

  if (!pasajero.nombres?.trim()) errores.nombres = 'Nombres es requerido';
  if (!pasajero.apellidos?.trim()) errores.apellidos = 'Apellidos es requerido';
  
  if (!pasajero.doc_tipo) {
    errores.doc_tipo = 'Tipo de documento es requerido';
  } else {
    if (pasajero.doc_tipo === '13' && !validarDUI(pasajero.doc_numero)) {
      errores.doc_numero = 'DUI inválido (9 dígitos)';
    } else if (pasajero.doc_tipo === '36' && !validarNIT(pasajero.doc_numero)) {
      errores.doc_numero = 'NIT inválido';
    } else if (pasajero.doc_tipo === '3' && !validarPasaporte(pasajero.doc_numero)) {
      errores.doc_numero = 'Pasaporte inválido (6-12 caracteres)';
    }
  }

  if (!pasajero.fecha_nacimiento) {
    errores.fecha_nacimiento = 'Fecha de nacimiento es requerida';
  } else if (!validarFechaNacimiento(pasajero.fecha_nacimiento)) {
    errores.fecha_nacimiento = 'Fecha de nacimiento inválida';
  }

  if (!pasajero.nacionalidad) errores.nacionalidad = 'Nacionalidad es requerida';
  
  if (pasajero.correo && !validarEmail(pasajero.correo)) {
    errores.correo = 'Correo electrónico inválido';
  }

  if (pasajero.telefono && !validarTelefono(pasajero.telefono)) {
    errores.telefono = 'Teléfono inválido (8 dígitos)';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
};

/**
 * Valida formulario de búsqueda
 */
export const validarBusqueda = (datos) => {
  const errores = {};

  if (!datos.origen) errores.origen = 'Origen es requerido';
  if (!datos.destino) errores.destino = 'Destino es requerido';
  if (datos.origen === datos.destino) {
    errores.destino = 'Destino debe ser diferente al origen';
  }
  if (!datos.fecha) errores.fecha = 'Fecha es requerida';
  
  const fechaBusqueda = new Date(datos.fecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fechaBusqueda < hoy) {
    errores.fecha = 'La fecha no puede ser en el pasado';
  }

  if (!datos.soloIda) {
    if (!datos.fechaRegreso) {
      errores.fechaRegreso = 'La fecha de regreso es requerida para ida y vuelta';
    } else if (new Date(datos.fechaRegreso) < new Date(datos.fecha)) {
      errores.fechaRegreso = 'La fecha de regreso no puede ser anterior a la salida';
    }
  }
  if (!datos.pasajeros || datos.pasajeros < 1) {
    errores.pasajeros = 'Debe haber al menos 1 pasajero';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
};