# Checkout web y facturación simulada

El checkout público crea primero una reserva pendiente y luego llama a PHP, que valida la sesión y delega el pago en el mismo `PaymentService` y flujo DTE del backoffice. Tarjetas y PayPal usan el simulador. Transferencias bancarias y Tigo Money/Chivo Wallet quedan pendientes para confirmación manual. El MH es simulado; el DTE no tiene validez fiscal.

## Configuración local

Define `WEB_CHECKOUT_SHARED_SECRET` en `backend/.env` con un secreto aleatorio de al menos 32 caracteres. PHP carga esa misma configuración en desarrollo. El endpoint interno predeterminado es `http://127.0.0.1:3000/internal/web-checkout/pagos`; si el API usa otra dirección, configura `WEB_CHECKOUT_API_URL` en el entorno PHP.

Reinicia el backend después de configurar la clave para que Node la cargue. No expongas el secreto en el JavaScript público.

## Producción

Configura el mismo `WEB_CHECKOUT_SHARED_SECRET` en el proceso Node y en el hosting PHP, y define en PHP `WEB_CHECKOUT_API_URL` con la URL privada o HTTPS del backend. El endpoint PHP solo invoca el servicio Node desde el servidor y comprueba que la reserva pertenezca a la sesión actual.

El correo de la factura se envía por el flujo de DTE existente. Si no hay proveedor de correo configurado, el servicio guarda el PDF y el JSON localmente y registra el envío como simulado.
