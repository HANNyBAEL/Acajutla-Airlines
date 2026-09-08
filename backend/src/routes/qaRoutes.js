const express = require('express');
const router = express.Router();
const c = require('../controllers/qaController');
const { verificarToken, verificarRol } = require('../middleware/auth');

router.use(verificarToken, verificarRol('admin', 'auditor'));
router.get('/pruebas', c.progress);
router.post('/pruebas/run', c.runBatch);
router.get('/checklist', c.checklist);

module.exports = router;