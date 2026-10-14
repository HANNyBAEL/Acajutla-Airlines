export const ROLE_DEFINITIONS = {
  admin: {
    label: 'Administrador',
    responsibility: 'Administra usuarios, configuración y operación completa del backoffice.',
    access: 'Todos los módulos y acciones administrativas',
  },
  operations: {
    label: 'Operaciones',
    responsibility: 'Coordina vuelos, aeropuertos, aeronaves, tripulación y servicios operativos.',
    access: 'Vuelos, reservas, flota, aeropuertos, operaciones, fiscalidad, comercial, reportes y check-in',
  },
  cashier: {
    label: 'Cajero',
    responsibility: 'Atiende reservas, clientes, cobros, reembolsos y documentos fiscales.',
    access: 'Reservas, clientes, pagos, DTE, notas, lista de espera, reportes y check-in',
  },
  airport_staff: {
    label: 'Personal aeroportuario',
    responsibility: 'Realiza check-in, asignación de asiento y embarque de pasajeros.',
    access: 'Check-in y embarque',
  },
  corporate_agent: {
    label: 'Agente corporativo',
    responsibility: 'Gestiona solicitudes y pasajeros en lista de espera de clientes corporativos.',
    access: 'Lista de espera comercial y consulta de vuelos',
  },
  auditor: {
    label: 'Auditor',
    responsibility: 'Consulta registros, indicadores y cumplimiento para labores de revisión.',
    access: 'Reportes, auditoría, QA y consultas de reservas, vuelos, pagos y DTE',
  },
};

export const ROLE_ORDER = ['admin', 'operations', 'cashier', 'airport_staff', 'corporate_agent', 'auditor'];

const ACCESS_BY_ROLE = {
  admin: ['*'],
  operations: ['dashboard', 'clientes', 'nueva-reserva', 'vuelos', 'aeropuertos', 'reservas', 'aeronaves', 'reportes', 'comercial', 'operaciones', 'fiscalidad', 'correos', 'notificaciones', 'checkin'],
  cashier: ['dashboard', 'clientes', 'nueva-reserva', 'reservas', 'pagos', 'dte', 'notas', 'contingencia', 'dte-export', 'reportes', 'comercial', 'cumplimiento', 'correos', 'notificaciones', 'checkin'],
  airport_staff: ['checkin', 'notificaciones'],
  corporate_agent: ['comercial', 'notificaciones'],
  auditor: ['dashboard', 'clientes', 'vuelos', 'reservas', 'pagos', 'dte', 'reportes', 'auditoria', 'cierre-qa', 'cumplimiento', 'correos', 'notificaciones'],
};

export const BACKOFFICE_ROLES = ROLE_ORDER;
export const STAFF_ROLE_ORDER = ROLE_ORDER;
export const DEFAULT_PAGE_BY_ROLE = {
  airport_staff: '/checkin',
  corporate_agent: '/comercial',
};

export const roleOf = (user) => user?.role || user?.rol || '';

export const canAccessPage = (role, page) => {
  const pages = ACCESS_BY_ROLE[role] || [];
  return pages.includes('*') || pages.includes(page);
};

export const rolesForPage = (page) => ROLE_ORDER.filter((role) => canAccessPage(role, page));
