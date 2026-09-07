const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { limiters } = require('./middleware/rateLimiter');
const { enmascararDatosSensibles } = require('./middleware/auth');
app.use(limiters.api);
app.use(enmascararDatosSensibles);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ nombre: 'SkyManager API - Acajutla Airlines', version: '1.0.0', estado: '✅ Operativo', timestamp: new Date().toISOString() });
});

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
app.use('/api/auditoria', require('./routes/auditRoutes'));
app.use('/api/empleados', require('./routes/empleadosRoutes'));
app.use('/api/aeronaves', require('./routes/aircraftRoutes'));

// Manejo de errores
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor SkyManager corriendo en http://localhost:${PORT}`);
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});