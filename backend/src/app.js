const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middlewares globales
app.use(cors({
  origin(origin, callback) {
    // Las solicitudes sin Origin incluyen comprobaciones del propio hosting.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS'));
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
  res.json({ nombre: 'SkyManager API - Acajutla Airlines', version: '1.0.0', estado: 'âœ… Operativo', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => res.json({ ok: true, service: 'skymanager-api' }));

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
app.use('/api/operaciones', require('./routes/operacionesRoutes'));
app.use('/api/qa', require('./routes/qaRoutes'));

// Manejo de errores
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error('âŒ Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`ðŸš€ Servidor SkyManager corriendo en http://localhost:${PORT}`);
  console.log(`ðŸ“¡ Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
