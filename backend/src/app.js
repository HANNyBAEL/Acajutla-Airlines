process.env.TZ = 'America/El_Salvador';
const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/simulation').protegerRed();

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const originsPermitidos = allowedOrigins.length
  ? allowedOrigins
  : process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5174', 'http://127.0.0.1:5174'];

if (process.env.NODE_ENV === 'production' && originsPermitidos.length === 0) {
  throw new Error('Configura CORS_ORIGIN con los orígenes permitidos antes de iniciar en producción.');
}

// Middlewares globales
app.use(cors({
  origin(origin, callback) {
    // Las solicitudes sin Origin incluyen comprobaciones del propio hosting.
    if (!origin || originsPermitidos.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { limiters } = require('./middleware/rateLimiter');
const { enmascararDatosSensibles } = require('./middleware/auth');
app.use(limiters.api);
app.use(enmascararDatosSensibles);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ nombre: 'Acajutla Airlines API', version: '1.0.0', estado: 'âœ… Operativo', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => res.json({ ok: true, service: 'acajutla-airlines-api' }));


const { auditarCambios } = require('./middleware/audit');
app.use(auditarCambios);

// Rutas
const authRoutes = require('./routes/authRoutes');
const vuelosRoutes = require('./routes/vuelosRoutes');
const reservasRoutes = require('./routes/reservasRoutes');
const pasajerosRoutes = require('./routes/pasajerosRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const dteRoutes = require('./routes/dteRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/vuelos', vuelosRoutes);
app.use('/api/aeropuertos', require('./routes/airportsRoutes'));
app.use('/api/reservas', reservasRoutes);
app.use('/api/clientes', require('./routes/clientesRoutes'));
app.use('/api/pasajeros', pasajerosRoutes);
app.use('/api/pagos', paymentRoutes);
app.use('/internal/web-checkout', require('./routes/webCheckoutRoutes'));
app.use('/api/dte', dteRoutes);
app.use('/api/notas', require('./routes/notasRoutes'));
app.use('/api/auditoria', require('./routes/auditRoutes'));
app.use('/api/empleados', require('./routes/empleadosRoutes'));
app.use('/api/aeronaves', require('./routes/aircraftRoutes'));
app.use('/api/reportes', require('./routes/reportesRoutes'));
app.use('/api/dte-eventos', require('./routes/eventosRoutes'));
app.use('/api/checkin', require('./routes/checkinRoutes'));
app.use('/api/correos', require('./routes/correosRoutes'));
app.use('/api/comercial', require('./routes/comercialRoutes'));
app.use('/api/dte-export', require('./routes/dteExportRoutes'));
app.use('/api/fiscal', require('./routes/fiscalRoutes'));
app.use('/api/fiscalidad', require('./routes/fiscalidadRoutes'));
app.use('/api/operaciones', require('./routes/operacionesRoutes'));
app.use('/api/qa', require('./routes/qaRoutes'));
app.use('/api/notificaciones', require('./routes/notificacionesRoutes'));

// Manejo de errores
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error('âŒ Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Acajutla Airlines corriendo en http://localhost:${PORT}`);
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  require('./services/expiracionService').iniciarJobExpiracion();
});
