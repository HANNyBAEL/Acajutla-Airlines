# Checkout web y facturación simulada

El sitio público crea una reserva pendiente en MySQL, calcula el total con las tarifas e impuestos vigentes y genera un token HMAC de corta duración. El navegador envía el token a `php/procesar_pago.php`; PHP valida el token, estado, límite de pago e importe contra la base de datos, y después delega el cobro al endpoint interno de Node usando `WEB_CHECKOUT_SHARED_SECRET`. Node ejecuta el mismo `PaymentService` y flujo DTE que usa el backoffice.

Tarjeta y PayPal usan el simulador del proyecto; para probar tarjetas, revisa los números de prueba que muestra el checkout. Las transferencias quedan pendientes de confirmación manual desde el backoffice. No se procesan fondos reales y el MH es simulado; el DTE no tiene validez fiscal. El checkout público no ofrece billeteras digitales ni servicios adicionales hasta que exista un catálogo/inventario público conectado al sistema.

## Configuración local

Define `WEB_CHECKOUT_SHARED_SECRET` en `backend/.env` con un secreto aleatorio de al menos 32 caracteres. Configura exactamente el mismo valor como variable de entorno del hosting PHP; nunca lo pongas en `index.php` ni en JavaScript. El endpoint interno predeterminado es `http://127.0.0.1:3000/internal/web-checkout/pagos`; en producción define `WEB_CHECKOUT_API_URL` en PHP con la URL HTTPS o privada del backend.

El hosting PHP debe tener cURL con verificación TLS habilitada y acceso a la misma base de datos que Node. `php/crear_reserva.php` no registra pagos: devuelve un token ligado al ID y PNR de esa reserva, con vencimiento de 30 minutos. El proxy PHP vuelve a validar el total del lado del servidor antes de enviar el cobro.

## Cuentas y reservas

El registro exige nombre, apellido, DUI, correo, teléfono y contraseña. `auth_registro.php` guarda nombre, apellido, tipo y número de documento, correo y teléfono en `customers`, y crea en la misma transacción la cuenta de `users` vinculada mediante `customer_id`. El login y registro crean una sesión PHP con cookie `HttpOnly` y `SameSite=Lax`; el sitio consulta `auth_sesion.php` para restaurarla y usa `auth_logout.php` para cerrarla. Para crear reservas, `crear_reserva.php` exige esa sesión (responde HTTP 401 si falta) y usa el cliente autenticado, nunca un ID enviado por el navegador. `mis_reservas.php` también solo acepta la sesión del servidor y no autoriza por un ID o email recibido desde la URL. Sirve el sitio y sus endpoints PHP bajo el mismo dominio y con HTTPS en producción para que la cookie de sesión quede protegida.

Reinicia el backend después de configurar la clave para que Node la cargue. No expongas el secreto en el JavaScript público.

## Producción

Configura el mismo `WEB_CHECKOUT_SHARED_SECRET` en el proceso Node y en el hosting PHP, y define en PHP `WEB_CHECKOUT_API_URL` con la URL privada o HTTPS del backend. El secreto solo viaja entre servidores; el navegador recibe un token limitado a una reserva y solo puede pagar el importe guardado en MySQL.

El correo de la factura se envía por el flujo de DTE existente. Si no hay proveedor de correo configurado, el servicio guarda el PDF y el JSON localmente y registra el envío como simulado.
