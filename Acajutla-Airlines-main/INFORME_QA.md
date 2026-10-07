# Informe de pruebas y hallazgos — Acajutla Airlines

**Fecha:** 7 de octubre de 2026  
**Carpeta revisada:** `Acajutla-Airlines-main/`  
**Alcance:** flujo público de búsqueda, selección de asientos, reserva/pago, cuentas, consulta de reservas y endpoints PHP.

## Resumen ejecutivo

La revisión estática encontró **13 incongruencias confirmadas** en el código y **1 riesgo dependiente de la configuración horaria de MySQL**. Los hallazgos más importantes permiten registrar reservas como pagadas sin una autorización real de pago, manipular el total enviado por el navegador, duplicar un mismo asiento dentro de una reserva y consultar reservas ajenas usando un identificador de cliente.

La página no se pudo ejecutar en este equipo: no está instalado PHP, no hay un servidor web escuchando en `localhost:80` y no está instalado WSL. La URL de API configurada en el código devolvió `404` tanto en `/` como en una búsqueda de vuelos. Por esto, las conclusiones funcionales siguientes se basan en análisis de código y pruebas estáticas; no se validaron contra una base de datos ni con una sesión real del navegador.

## Método y resultados de ejecución

| Prueba | Resultado | Evidencia |
|---|---|---|
| Compilación sintáctica del JavaScript inline de `index.php` más el código incluido de `vuelos.php` | **Pasa** | Se analizaron 4,118 líneas de JavaScript con el parser de Node.js, sin errores de sintaxis. |
| PHP lint de endpoints | **No ejecutable** | El comando `php` no está disponible en el equipo. |
| Abrir la web local | **Bloqueada por entorno** | `http://localhost/Acajutla_Airlines/` rechazó la conexión; no había servidor escuchando en el puerto 80. |
| API remota configurada | **Falla** | `https://acajutla-airlines-api.onrender.com/` y `/api/vuelos/buscar?...` respondieron HTTP 404. |
| Flujos con MySQL (búsqueda real, registro, asiento, pago y reserva) | **No ejecutables aquí** | Requieren PHP, servidor y acceso funcional a la base de datos. No envié solicitudes que creen cuentas, reservas o pagos. |

La opción `USE_MOCKS` está activa en el frontend; eso no vuelve inocua toda la aplicación: algunas operaciones siguen llamando endpoints PHP reales y guardan datos en MySQL.

## Hallazgos

### QA-01 — Una aprobación simulada termina guardada como pago real

**Severidad: Crítica**  
**Archivos:** `index.php:732`, `index.php:1726-1730`, `index.php:3574-3626`, `php/crear_reserva.php:245-273`, `php/crear_reserva.php:297-321`.

**Qué ocurre:** `USE_MOCKS` está en `true` y `Api.crearPago()` devuelve `{ok:true, estado:'APROBADO'}` tras una espera, sin contactar con un procesador de pagos. Inmediatamente después, `Pago.procesar()` envía la reserva al endpoint PHP real. Ese endpoint crea `reservations.status='paid'` y registra un pago aprobado. Además, si falta el estado del pago o llega un valor no reconocido, el PHP usa `APROBADO` como valor por defecto.

**Cómo reproducir cuando haya servidor disponible:**

1. Seleccionar un vuelo, pasajeros y método de pago.
2. Introducir datos que pasen la validación local del formulario.
3. Pulsar **Pagar ahora**.
4. Revisar la respuesta del endpoint y las tablas `reservations` y `payments`.

**Esperado:** la reserva solo se marca pagada después de una autorización verificable del procesador, validada por el servidor.  
**Observado en el código:** el frontend simula la aprobación y el backend la persiste como pagada sin validar una transacción externa. En transferencia también puede terminar como aprobada aunque el medio normalmente requiera confirmación.

**Impacto:** una reserva puede parecer cobrada y confirmada sin que exista un cargo o confirmación bancaria.

---

### QA-02 — El servidor acepta el total y el importe enviados por el navegador

**Severidad: Crítica**  
**Archivo:** `php/crear_reserva.php:104-116`, `php/crear_reserva.php:266-273`, `php/crear_reserva.php:297-319`; el frontend compone esos valores en `index.php:3609-3615`.

**Qué ocurre:** el endpoint solo comprueba que `total` sea numérico. Guarda ese importe como `estimated_total` y `paid_total`; el precio de cada tramo también se acepta desde `precio_unitario`. El importe del registro de pago se toma de `pago.monto`, también enviado por el navegador, o se sustituye por `total`. No se vuelve a calcular el precio usando las tarifas vigentes de la base de datos ni se exige que reserva, tarifa e importe pagado coincidan. Tampoco se rechaza un total cero o negativo.

**Cómo reproducir cuando haya servidor disponible:** enviar a `php/crear_reserva.php` un payload válido de prueba alterando `total`, `pago.monto` o `segmentos[].precio_unitario`, y comparar esos valores con las tarifas de MySQL y los importes guardados.

**Esperado:** el servidor obtiene la tarifa desde la base de datos, calcula el total y verifica la autorización/cantidad del procesador; ignora cualquier total de cliente que no coincida.  
**Impacto:** un cliente puede manipular el precio registrado y crear una reserva pagada por un monto diferente al valor comercial.

---

### QA-03 — Se puede asignar el mismo asiento a dos pasajeros en una misma solicitud

**Severidad: Alta**  
**Archivo:** `php/crear_reserva.php:194-236`, inserción en `php/crear_reserva.php:458-478`.

**Qué ocurre:** el endpoint carga los asientos ocupados previamente y comprueba cada asiento solicitado contra ese conjunto. No agrega los asientos solicitados al conjunto durante la comprobación. Por ello, dos pasajeros del mismo payload pueden pedir el mismo asiento y ambos pasan la validación; después se insertan los dos segmentos. El comentario del endpoint indica además que no se cuenta con una restricción `UNIQUE` compuesta que lo detenga.

**Cómo reproducir:** enviar una reserva de dos pasajeros para un vuelo, con `asientos: ["5A", "5A"]`, cuando `5A` aún está libre.

**Esperado:** HTTP 409 y ninguna reserva parcial, o una única asignación del asiento.  
**Observado en el código:** cada comprobación solo mira asientos ya guardados; el primer asiento solicitado no se marca como ocupado antes de revisar el segundo.

**Impacto:** dos pasajeros pueden quedar confirmados con el mismo asiento.

---

### QA-04 — La lista “Mis reservas” permite consultar reservas de otro cliente

**Severidad: Alta**  
**Archivo:** `php/mis_reservas.php:49-59`, `php/mis_reservas.php:117-130`, `php/mis_reservas.php:145-153`.

**Qué ocurre:** el endpoint GET acepta `customer_id` o correo como parámetros y no requiere sesión ni valida que el solicitante sea dueño de ese cliente. La consulta usa el identificador recibido directamente y devuelve PNR, estado, fecha y total.

**Cómo reproducir:** solicitar `php/mis_reservas.php?customer_id=<id_de_otro_cliente>` sin autenticación.

**Esperado:** responder únicamente con reservas vinculadas a la identidad autenticada o después de verificar un segundo factor.  
**Impacto:** exposición de PNR y datos comerciales de reservas ajenas; el PNR puede facilitar consultas posteriores.

---

### QA-05 — Una cuenta sin verificar puede apropiarse de reservas de invitado usando un correo

**Severidad: Alta**  
**Archivo:** `php/auth_registro.php:79-87`, `php/auth_registro.php:104-145`.

**Qué ocurre:** el registro crea la cuenta inmediatamente y no exige confirmar que la persona controla el correo. Después vincula a la cuenta las reservas de invitado cuyos comprobantes figuran en `email_outbox` para ese correo.

**Cómo reproducir:** crear una reserva como invitado con un correo que aún no exista en `customers`/`users`; registrar una cuenta utilizando ese correo sin completar una verificación por email; consultar las reservas de la cuenta.

**Esperado:** verificar el correo antes de permitir el acceso y la vinculación retroactiva de reservas.  
**Impacto:** si alguien conoce el correo de un cliente invitado, puede registrar primero esa dirección y reclamar sus reservas. El escenario depende de que el correo aún no tenga una cuenta asociada.

---

### QA-06 — El enlace de restablecimiento confía en el encabezado `Host`

**Severidad: Alta**  
**Archivo:** `php/auth_recuperar.php:102-108`.

**Qué ocurre:** el enlace del correo se arma con `$_SERVER['HTTP_HOST']`, un valor proporcionado por la solicitud, en vez de usar un dominio fijo/configurado. El protocolo también se deduce de `HTTPS`/puerto del request, lo que puede producir un enlace `http://` si el proxy inverso no reenvía esa información como espera PHP.

**Cómo reproducir en una prueba controlada:** enviar una solicitud de recuperación con un encabezado `Host` distinto y revisar el dominio/protocolo del enlace generado; no realizar este envío a un usuario real.

**Esperado:** construir el enlace usando el dominio HTTPS autorizado de la aplicación.  
**Impacto:** posibilidad de enviar enlaces de recuperación con un host controlado por la solicitud; el riesgo aumenta si la solicitud se procesa detrás de un proxy con detección HTTPS incorrecta.

---

### QA-07 — El plazo real del token de recuperación no coincide con el mensaje del correo

**Severidad: Media**  
**Archivos:** `php/auth_recuperar.php:89` y contenido del correo alrededor de `php/auth_recuperar.php:135`; `php/auth_reset_password.php:54-60`.

**Qué ocurre:** el token se guarda con vencimiento de **2 horas**, mientras el correo indica **60 minutos**. La consulta de restablecimiento acepta el token mientras `expires_at > NOW()` (o si `created_at` está dentro de la última hora), así que el vencimiento de dos horas prevalece.

**Esperado:** que la caducidad informada al usuario y la condición del servidor sean iguales.  
**Impacto:** el usuario recibe un plazo incorrecto y los tokens quedan utilizables más tiempo del que el mensaje promete.

---

### QA-08 — El registro permite contraseñas más débiles que el restablecimiento

**Severidad: Media**  
**Archivos:** `php/auth_registro.php:79-82` y `php/auth_reset_password.php:46-55`.

**Qué ocurre:** el alta solo rechaza la contraseña vacía y una longitud superior a 200; permite una contraseña de un solo carácter o espacios. El restablecimiento sí exige seis caracteres.

**Esperado:** una política única aplicada en registro y restablecimiento.  
**Impacto:** cuentas nuevas pueden crearse con credenciales triviales y, después, el flujo de cambio no permite conservar una política consistente.

---

### QA-09 — Si falla el catálogo real, se muestran aeropuertos mock pero la búsqueda sigue siendo real

**Severidad: Media**  
**Archivo:** `index.php:1554-1580` y `index.php:1599-1612`.

**Qué ocurre:** cuando falla `php/aeropuertos.php`, `obtenerAeropuertos()` presenta datos mock. Sin embargo, `buscarVuelos()` siempre llama a `php/buscar_vuelos.php` y retorna una lista vacía si ese endpoint falla. Los IDs mock pueden no corresponder a los IDs reales de MySQL.

**Cómo reproducir:** hacer que el endpoint de aeropuertos falle mientras la búsqueda permanece conectada al endpoint real; elegir un aeropuerto de respaldo y buscar un vuelo.

**Esperado:** mantener ambas operaciones en modo mock o ambas en modo real, y evitar combinar identificadores de catálogos distintos.  
**Impacto:** el usuario puede seleccionar aeropuertos que aparecen disponibles pero no encontrar vuelos, incluso si hay vuelos reales para los códigos mostrados.

---

### QA-10 — Se pueden ofrecer tarifas vencidas o aún no vigentes

**Severidad: Alta**  
**Archivo:** `php/buscar_vuelos.php:233-238`.

**Qué ocurre:** la consulta de tarifas comprueba `fc.active` y `ff.active`, pero no filtra por `ff.valid_from <= NOW()` ni por `ff.valid_to IS NULL OR ff.valid_to > NOW()`. Puede devolver filas activas fuera de su periodo de vigencia. El endpoint de reserva tampoco recalcula el precio desde la tarifa vigente (QA-02).

**Cómo reproducir:** cargar en un entorno de prueba una tarifa activa con `valid_from` futuro o `valid_to` pasado y consultar el vuelo.

**Esperado:** mostrar y aceptar únicamente tarifas activas y vigentes a la fecha de compra.  
**Impacto:** se muestran precios futuros/vencidos y pueden persistirse importes que no corresponden a una tarifa actual.

---

### QA-11 — El endpoint de reserva no vuelve a validar el estado del vuelo ni de la aeronave

**Severidad: Alta**  
**Archivos:** filtro de búsqueda en `php/buscar_vuelos.php:113-123`; reserva en `php/crear_reserva.php:167-190`.

**Qué ocurre:** la búsqueda excluye vuelos cancelados, completados y en curso. Pero al reservar, el endpoint solo bloquea la fila y consulta `id`, `departure_datetime` y una comparación de hora; no vuelve a consultar `flights.status`, `aircraft.status` ni `aircraft.active`. Un cliente puede modificar el `flight_id` y enviar una solicitud para un vuelo futuro cancelado o con aeronave inactiva/de mantenimiento.

**Cómo reproducir:** en un entorno de prueba, enviar directamente a `php/crear_reserva.php` un `flight_id` de un vuelo futuro cancelado o con aeronave fuera de servicio, con asientos libres.

**Esperado:** dentro de la misma transacción, verificar que el vuelo siga vendible y que la aeronave esté operativa.  
**Impacto:** se puede confirmar una reserva que no aparece en la búsqueda pública y no debería ser vendible.

---

### QA-12 — La búsqueda del calendario lanza hasta 31 solicitudes simultáneas por mes

**Severidad: Media**  
**Archivo:** `index.php:1829-1853`.

**Qué ocurre:** `getFlightPricesByDate()` crea una solicitud PHP por cada día del mes y las ejecuta con `Promise.all`. Un mes puede generar 28–31 consultas concurrentes por cada ruta/calendario sin límite de concurrencia ni timeout explícito.

**Cómo reproducir:** abrir el calendario de precios para una ruta y observar la pestaña Network del navegador; contar las llamadas a `buscar_vuelos.php`.

**Esperado:** un endpoint agregado por mes o un límite de concurrencia/cache de servidor.  
**Impacto:** carga innecesaria de PHP/MySQL, demoras y mayor probabilidad de que parte del calendario aparezca como no disponible cuando alguna petición falla.

---

### QA-13 — Hay una copia antigua del endpoint de reservas en una ruta alternativa

**Severidad: Media**  
**Archivos:** `php/crear_reserva.php` y `Acajutla_Airlines/php/crear_reserva.php`.

**Qué ocurre:** existen dos versiones distintas de `crear_reserva.php`. La copia anidada no contiene las mismas validaciones: la comparación para evitar reservas de vuelos ya salidos y el registro del pago difieren respecto al endpoint que ahora usa el frontend. Además, en `Acajutla_Airlines/php/` solo se encontraron `crear_reserva.php` y `asientos_ocupados.php`; no hay un `conexion.php` hermano, aunque la copia lo requiere con `__DIR__ . '/conexion.php'`.

**Cómo reproducir en un servidor que publique ambas carpetas:** solicitar la ruta anidada `/Acajutla_Airlines/php/crear_reserva.php` y compararla con `/php/crear_reserva.php`.

**Esperado:** una sola implementación activa o versiones idénticas con dependencias válidas.  
**Impacto:** confusión sobre cuál endpoint es autoritativo; la ruta antigua puede fallar con error PHP o mantener reglas distintas si la carpeta se publica.

## Riesgo por confirmar — Zona horaria de MySQL

**Archivo:** `php/buscar_vuelos.php:123`; se repite la conversión en otros endpoints PHP.

La aplicación convierte `NOW()` de `+00:00` a `-06:00`, lo que presupone que la hora de sesión/servidor de MySQL está en UTC y que los `DATETIME` guardados representan hora local de El Salvador. Sin acceso al servidor de base de datos no pude confirmar esos dos supuestos. Si MySQL ya opera en hora local, el filtro puede desplazar seis horas la disponibilidad; si guarda las fechas en UTC, comparar con fecha local también requiere una conversión coherente.

## Matriz funcional solicitada y estado

| Área | Cobertura posible en esta sesión | Resultado |
|---|---|---|
| Sintaxis JavaScript y composición de `index.php` + `vuelos.php` | Estática | Pasa |
| Presentación/navegación en navegador | No | Bloqueada: PHP/server local ausentes |
| Catálogo y búsqueda de vuelos contra MySQL | No | Bloqueada: PHP/server/DB no disponibles |
| Reserva y selección concurrente de asientos | Revisión de código | Detectado QA-03; no hubo prueba de concurrencia contra DB |
| Cobro y confirmación | Revisión de código | Detectados QA-01 y QA-02; no hubo transacción real |
| Registro, login y recuperación | Revisión de código | Detectados QA-05 a QA-08; no se transmitieron datos personales |
| API remota | HTTP GET de solo lectura | HTTP 404 en las rutas probadas |

## Recomendación de priorización

1. Resolver primero QA-01 y QA-02: no marcar pagos/reservas como pagados sin autorización verificable y recalcular precios en servidor.
2. Resolver QA-03 y QA-11: validar unicidad/capacidad/configuración de asientos y estado vigente del vuelo/aeronave dentro de la transacción.
3. Resolver QA-04 a QA-06: proteger `mis_reservas`, verificar correos antes de vincular reservas y fijar el dominio HTTPS para restablecimiento.
4. Corregir QA-07 a QA-10 y QA-12 a QA-13: unificar políticas, disponibilidad de tarifa, modo de datos, carga del calendario y endpoint autoritativo.

## Límite del informe

Este informe detalla los problemas que pude confirmar desde el código disponible y las verificaciones estáticas. No equivale a una certificación de seguridad ni a una prueba completa de producción. Para completar la prueba dinámica se necesita un entorno de prueba con PHP 8.2, Apache, la base de datos de pruebas y credenciales de prueba; no se deben usar compradores, tarjetas ni datos personales reales.
