const express = require('express');
const router = express.Router();
const controller = require('../controllers/webCheckoutController');
const { autenticarCheckoutWeb } = require('../middleware/webCheckoutAuth');

router.post('/pagos', autenticarCheckoutWeb, controller.procesarPago);

module.exports = router;
