const express = require('express');
const router = express.Router();
const controller = require('../controllers/reservasController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken);

// Ruta para cancelar reservas expiradas y liberar asientos
router.post('/expiradas/cancelar', verificarRol('admin', 'operations', 'cashier'), async (req, res) => {
  const pool = require('../config/db');
  try {
    await pool.query(`
      UPDATE reservations r
      SET r.status = 'cancelled', r.cancelled_at = NOW()
      WHERE r.status = 'pending' 
        AND r.time_limit < NOW()
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.reservation_id = r.id AND p.status = 'approved')
    `);
    
    // Liberar segmentos de vuelos asociados a reservas canceladas por expiración
    await pool.query(`
      DELETE fs FROM flight_segments fs
      INNER JOIN reservations r ON fs.reservation_id = r.id
      WHERE r.status = 'cancelled' AND r.cancelled_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `);
    
    res.json({ exito: true, mensaje: 'Reservas expiradas canceladas y asientos liberados' });
  } catch (error) {
    console.error('Error al cancelar reservas expiradas:', error);
    res.status(500).json({ error: 'Error interno al procesar expiradas' });
  }
});

// Ruta mejorada para obtener reservas expiradas (ya no devuelve lista vacía)
router.get('/expiradas', verificarRol('admin', 'operations', 'cashier', 'auditor'), async (req, res) => {
  const pool = require('../config/db');
  try {
    const [rows] = await pool.query(`
      SELECT r.*, c.first_names, c.last_names, c.email
      FROM reservations r
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.status = 'pending' 
        AND r.time_limit < NOW()
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.reservation_id = r.id AND p.status = 'approved')
      ORDER BY r.time_limit ASC
    `);
    res.json({ exito: true, datos: rows, total: rows.length });
  } catch (error) {
    console.error('Error al obtener reservas expiradas:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.get('/:pnr', controller.consultarReserva);
router.post('/', verificarRol('admin', 'cashier', 'operations'), controller.crearReserva);
router.get('/', verificarRol('admin', 'cashier', 'operations', 'auditor'), controller.listarReservas);
router.post('/:pnr/cancelar', verificarRol('admin', 'cashier', 'operations'), controller.cancelarReserva);

module.exports = router;