**Informe de pruebas y revisión lógica — SkyManager / Acajutla Airlines**

Fecha: 12 de octubre de 2026, zona America/El_Salvador.

**Resultado: no dar el sistema por listo para operación real.** Compila y supera sus regresiones existentes, pero hay bloqueos de autenticación, reservas con asiento y check-in; exposición de datos entre usuarios; e inconsistencias en precios, pagos y facturación. Este informe registra los hallazgos de la revisión realizada, no garantiza la ausencia de otros errores.

Se revisó el estado completo del directorio, incluidos cambios locales anteriores. No se corrigió código de la aplicación ni se modificaron registros de negocio. Se añadieron pruebas y evidencia. La base configurada se consultó con una transacción de solo lectura; pagos, cambios de estado, correo y MH se sustituyeron por dependencias ficticias en las reproducciones.

**Pruebas ejecutadas y alcance**

| Comprobación | Resultado | Alcance real |
|---|---|---|
| `npm test` en la raíz | Correcto | Sintaxis de 135 archivos JS, regresiones del backend y compilación del backoffice |
| Regresiones existentes | 42 comprobaciones aprobadas | 23 de lógica, 16 de eventos DTE y 3 comprobaciones finales de checkout/workflow/QR |
| Pruebas adicionales de aceptación | **2 aprobadas, 24 fallidas, 26 en total** | Funciones reales y rutas Express, datos ficticios, sin escribir en la BD real |
| `php -l` | 29 archivos correctos | Sintaxis PHP; no equivale a validar sus reglas de negocio |
| JavaScript del portal renderizado por PHP | Correcto | Un script principal analizado después de resolver la inclusión de `vuelos.php` |
| MySQL | Conexión disponible | Metadatos, relojes, índices, triggers, consultas sintéticas y conteos agregados |
| Navegador: portal público | Inicio, catálogos, validación de búsqueda vacía y navegación al acceso funcionan | Sin completar una reserva ni efectuar un cobro |
| Navegador: backoffice | Redirección a `/login` y formulario visibles | Sin iniciar una sesión real; dos advertencias de futura migración de React Router, sin errores de consola en esta pantalla |
| ESLint | No ejecutable con las dependencias declaradas | Importar su configuración falla: falta `@eslint/js` |
| `npm audit` backend | 9 paquetes señalados | 1 crítico, 5 altos, 3 moderados |
| `npm audit` frontend | 15 paquetes señalados | 8 altos, 7 moderados |

Los 24 fallos nuevos son criterios de aceptación incumplidos, no necesariamente 24 causas independientes. Algunas pruebas aíslan un segundo problema que actualmente está oculto por otro bloqueo; se indica donde corresponde. Los dobles de BD no demuestran comportamiento real bajo carga ni reproducen todos los detalles de MySQL. En `db-readonly.json`, `ok` significa que se pudo ejecutar la consulta, no que su resultado cumpla una regla de negocio.

**Cómo interpretar la prioridad**

Alta: corregir antes de usar el flujo afectado con datos reales. Media: corregir antes de una entrega estable. Las alertas de dependencias conservan la gravedad del registro npm; su explotabilidad concreta debe evaluarse separadamente.

**Acceso, seguridad y disponibilidad**

1. **Alta — El MFA falla al generar el código.** `Usuario.generarCodigoMFA` llama a `crypto.randomInt` sin importar `node:crypto`. En Node 24.15.0, la reproducción devuelve `crypto.randomInt is not a function`. Bloquea el acceso de usuarios que requieren MFA. Importar explícitamente el módulo correcto. Evidencia: `AUTH-01`. [Usuario.js](C:/Users/henry/Desktop/Aviacion/backend/src/models/Usuario.js:95).

2. **Alta — El segundo inicio con MFA conserva el código como utilizado.** El `ON DUPLICATE KEY UPDATE` renueva código y fecha, pero no restaura `used = FALSE`. Hay un índice único real sobre `user_id`; después de consumir el primer código, los siguientes quedan inválidos. La prueba aporta únicamente el import faltante para aislar esta causa. Evidencia: `AUTH-02`. [Usuario.js](C:/Users/henry/Desktop/Aviacion/backend/src/models/Usuario.js:100).

3. **Alta — El reloj de MFA está desfasado seis horas respecto de MySQL.** El driver serializa fechas en `-06:00`, mientras `NOW()` de la sesión MySQL está en UTC. En la consulta real de solo lectura, un vencimiento calculado cinco minutos hacia el futuro se serializó como `08:19:23`; MySQL tenía `14:14:23` y devolvió `still_valid = 0`. Corregir la convención de fechas de vencimiento; preferiblemente calcular creación y validación con el mismo reloj SQL. También afecta la duración efectiva de los refresh tokens, aunque estos no vencen inmediatamente. Evidencia: `mfa_expiry_with_actual_driver_timezone` en el JSON de BD. [db.js](C:/Users/henry/Desktop/Aviacion/backend/src/config/db.js:18), [Usuario.js](C:/Users/henry/Desktop/Aviacion/backend/src/models/Usuario.js:95).

4. **Alta — El bloqueo de cuentas está deshabilitado sin depender del entorno.** `bloqueado = false` ignora `blocked_until`, y el umbral está fijado en 1000 intentos. Una cuenta bloqueada puede iniciar sesión con contraseña correcta. El comentario “en desarrollo” no establece ninguna condición para producción. Evidencia: `AUTH-03`. [authService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/authService.js:10).

5. **Alta — Una cuenta inactiva puede recibir tokens al completar MFA.** `verificarMFA` comprueba existencia, pero no `status === 'active'`. Escenario: se inicia el reto, el administrador desactiva la cuenta y después se presenta el código. Debe revalidar estado y permisos antes de emitir tokens. Evidencia: `AUTH-04`; se prueba con un código válido para aislar esta regla de los bloqueos anteriores. [authService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/authService.js:46).

6. **Media — Los límites de API, búsquedas y login comparten contador.** Las instancias usan el mismo `Map` y la misma clave IP. Tras 101 peticiones permitidas de API, el primer intento de login recibe 429. Separar claves por tipo de límite; revisar además la configuración de proxy cuando se despliegue. Evidencia: `AUTH-05`. [rateLimiter.js](C:/Users/henry/Desktop/Aviacion/backend/src/middleware/rateLimiter.js:1).

7. **Alta — Un cliente autenticado puede consultar información de otros clientes.** Las rutas `GET /api/reservas/:pnr`, `/api/pasajeros/reserva/:reservation_id` y `/api/clientes/buscar` no comprueban pertenencia ni restringen apropiadamente el rol. Las tres devolvieron 200 para un JWT `customer` y datos ajenos ficticios. La segunda usa IDs secuenciales y la tercera acepta búsquedas amplias. Exigir autorización por objeto y limitar el directorio a personal autorizado. Evidencia: `ACL-01`, `ACL-02`, `ACL-03`. [reservasRoutes.js](C:/Users/henry/Desktop/Aviacion/backend/src/routes/reservasRoutes.js:8), [pasajerosRoutes.js](C:/Users/henry/Desktop/Aviacion/backend/src/routes/pasajerosRoutes.js:7), [clientesRoutes.js](C:/Users/henry/Desktop/Aviacion/backend/src/routes/clientesRoutes.js:8).

8. **Alta — La auditoría conserva secretos cuando llegan como números.** `sanear` retorna números antes de examinar el nombre de la propiedad. Un PAN, CVV o documento numérico queda en claro, incluso si la solicitud termina rechazada. La prueba captura el registro que se intentaría escribir sin persistirlo. Aplicar la clasificación de claves antes del tipo de valor. Evidencia: `LOG-01`. [audit.js](C:/Users/henry/Desktop/Aviacion/backend/src/middleware/audit.js:28).

9. **Media — La conexión Node–MySQL no verifica el certificado TLS.** `rejectUnauthorized: false` cifra el tráfico sin autenticar debidamente al servidor. Configurar la CA del proveedor y exigir validación. Hallazgo por inspección; no se hizo una prueba de interceptación. [db.js](C:/Users/henry/Desktop/Aviacion/backend/src/config/db.js:21).

10. **Alta — Un fallo SQL en Fiscalidad puede terminar el backend.** Varios controladores `async` no capturan errores ni los pasan a `next`. Express 4 no procesa automáticamente el rechazo de esa promesa. Con la ruta real `listarReglas` y un error SQL ficticio, un proceso Node aislado terminó con código 1 en vez de responder 500. Envolver todos esos handlers o propagar los errores al middleware. Evidencia: `HTTP-01`. [fiscalidadController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/fiscalidadController.js:15).

**Reservas, vuelos, tripulación y servicios**

11. **Alta — Crear una reserva con asiento explícito falla por SQL ambiguo.** `validarAsiento` selecciona `id` sin alias al unir dos tablas que lo tienen. MySQL real devuelve `ER_NON_UNIQ_ERROR: Column 'id' in field list is ambiguous`, incluso con un vuelo inexistente de prueba. Usar `fs.id`. Las reservas sin asiento no pasan por esa consulta. Evidencia: `ambiguous_seat_query`. [FlightSegment.js](C:/Users/henry/Desktop/Aviacion/backend/src/models/FlightSegment.js:56).

12. **Media — El detalle mezcla pasajeros con segmentos de otros pasajeros.** La unión se hace por reserva, no por `fs.passenger_id = p.id`. Una consulta sintética real con dos pasajeros y dos asientos produjo cuatro filas; cada pasajero apareció con ambos asientos. Corregir la relación y probar también varios tramos. Evidencia: `passenger_join_synthetic`. [Reserva.js](C:/Users/henry/Desktop/Aviacion/backend/src/models/Reserva.js:32).

13. **Alta — El check-in rechaza una tripulación válida.** Busca `role_operativo === 'copiloto'`, pero el ENUM real y la interfaz usan `copilot`. Piloto y copiloto correctamente asignados reciben 409. Unificar códigos internos. Evidencia: `OPS-01` y esquema real en `db-readonly.json`. [checkinController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/checkinController.js:149).

14. **Alta — Un abono mínimo habilita el check-in y evita la expiración ordinaria.** El pago parcial cambia la reserva a `confirmed`; check-in acepta ese estado sin revisar saldo, y el job solo expira `pending`. La prueba aislada permitió check-in con $1 pagado y $99 pendientes, suministrando el literal `copiloto` para superar el bloqueo del punto 13. Definir explícitamente si se permite crédito; de lo contrario exigir saldo cero y gestionar el plazo del saldo pendiente. No se encontraron segmentos actualmente embarcados con saldo en el conteo consultado. Evidencia: `OPS-02`. [paymentService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentService.js:69), [checkinController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/checkinController.js:142), [expiracionService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/expiracionService.js:12).

15. **Alta — El mapa y la asignación permiten asientos que exceden la capacidad.** Usan seis columnas y `ceil(capacidad / 6)` sin limitar la última fila ni emplear la configuración física. Se aceptó `1F` en un avión de dos plazas; esa capacidad existe entre los tipos consultados. Modelar los asientos reales y usar el mismo catálogo en venta y check-in. Evidencia: `OPS-03`. [checkinController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/checkinController.js:105).

16. **Media — Cerrar vuelo no valida el estado previo.** Solo exige gate, aeronave y ausencia de pasajeros en `checked_in`. Un vuelo cancelado puede pasar a `completed`; tampoco se comprueba la secuencia operativa. La reproducción devuelve 200. Establecer transiciones permitidas y validarlas dentro de una transacción. Evidencia: `OPS-04`. [checkinController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/checkinController.js:223).

17. **Alta — Se permite asignar tripulación inactiva y eludir comprobaciones horarias.** `asignarCrew` no comprueba `active`. Además, solapamiento y descanso solo se validan cuando llegan ambas horas; omitirlas permite saltarse esos controles. La asignación de un tripulante inactivo devolvió 201. Derivar el horario del vuelo o exigirlo, y comprobar actividad, vigencia y disponibilidad. Evidencia ejecutada: `OPS-05`; omisión horaria verificada en código. [operacionesController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/operacionesController.js:44).

18. **Alta — Añadir servicios no comprueba el estado ni las relaciones de la reserva.** Se valida stock, pero no que pasajero y vuelo pertenezcan a la reserva ni que esta admita modificaciones. También aumenta `estimated_total` en una reserva pagada sin ajustar su estado o el DTE existente. Verificar pertenencia, bloquear la reserva y definir cobro/facturación del adicional. Evidencia: `COM-01`; los IDs deben existir para satisfacer las FK, pero eso no garantiza pertenencia. [comercialController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/comercialController.js:122).

19. **Media — El botón de activar/desactivar servicios envía un cambio parcial a un UPDATE completo.** La interfaz manda solo `{ active }`, mientras el controlador sustituye también código, nombre, tipo y precio con valores ausentes. Puede provocar un error de restricciones o borrar datos si el esquema lo permite. Implementar actualización parcial o enviar todos los campos. Evidencia: `COM-02` confirma los parámetros `undefined`; no se hizo el UPDATE real. [Comercial.jsx](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/pages/Comercial.jsx:70), [comercialController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/comercialController.js:87).

**Cobros y documentos**

20. **Media — La pasarela simulada puede aprobar una tarjeta vacía.** El algoritmo Luhn retorna verdadero para una cadena vacía; el camino de tarjeta desconocida puede aprobarla aleatoriamente. Se reprodujo `APPROVED` fijando únicamente la aleatoriedad del simulador. El middleware que valida longitud no está conectado a la ruta de pagos vigente. Validar tipo, longitud y formato en el flujo realmente utilizado. Evidencia: `PAY-01`. [paymentGateway.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentGateway.js:74), [paymentRoutes.js](C:/Users/henry/Desktop/Aviacion/backend/src/routes/paymentRoutes.js:12).

21. **Media — La tarjeta vence al empezar su último día de vigencia.** `new Date(anio, mes, 0)` representa medianoche del último día. El 31 de octubre al mediodía se rechaza `10/26`. Comparar contra el comienzo del mes siguiente. Evidencia: `PAY-02`. [paymentGateway.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentGateway.js:85).

22. **Media — El backend admite transferencias sin referencia que después no se pueden confirmar.** Registra `pending_confirmation` con `external_reference = null`, pero confirmar y sumar pendientes requieren referencia no nula. Se generan intenciones que quedan fuera del flujo normal. Exigir referencia antes de insertar. Evidencia: `PAY-03`. [paymentService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentService.js:36), [paymentService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentService.js:98).

23. **Alta — Se confirma una transferencia después de vencer la reserva si el job aún no cambió su estado.** El cobro inicial comprueba `time_limit`; la confirmación solo comprueba el estado textual. La reproducción confirmó una reserva `pending` con plazo en el año 2000. Validar el vencimiento SQL dentro del bloqueo de la reserva. Evidencia: `PAY-04`. [paymentService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentService.js:93).

24. **Alta — El generador marca como aceptado un DTE que no pasa su propio validador.** La FE generada usa `version: 3`, mientras el catálogo interno espera 2, y sus ítems omiten `cantidad`. La prueba obtiene `accepted` y luego dos errores al ejecutar `validarDTECompleto`. CCFE comparte el valor fijo de versión aunque el catálogo interno espera 4. Integrar el validador completo y contrastar los esquemas con la especificación fiscal que corresponda antes de una integración real. Esto demuestra incoherencia interna; no constituye certificación del catálogo interno frente a la normativa vigente. Evidencia: `DTE-01`. [dteService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:139), [validators.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dte/validators.js:207).

25. **Alta — CCFE omite la validación completa del receptor.** El flujo exige NIT, pero la validación del receptor solo se ejecuta para FE. Un CCFE con NIT y sin NRC fue aceptado por el simulador. Aplicar los requisitos del tipo de documento antes de persistir o transmitir. Evidencia: `DTE-02`. [dteService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:135), [dteService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:250).

26. **Alta — Dos facturas simultáneas pueden obtener el mismo número de control.** `MAX(annual_correlative) + 1` se calcula fuera de la transacción; el bloqueo posterior es por reserva y no serializa reservas diferentes. En la reproducción concurrente, usando la restricción única que existe en MySQL, una emisión falló por `uk_control_number`. Usar un contador transaccional por tipo/año y una política de reintento. La restricción evita persistir dos números iguales, pero deja una venta con error de emisión. Evidencia: `DTE-03` y `dte_indexes`. [dteService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:38).

27. **Media — La factura pierde la distribución real de tarifas y medios de pago.** Divide la base total por igual entre pasajeros aunque adulto, niño e infante tienen precios distintos. Además, selecciona solo el último pago aprobado y atribuye a su medio la totalidad de la factura. Ejemplos: una venta de $100 + $75 aparece como $87.50 por pasajero; $50 efectivo + $50 tarjeta aparece íntegramente bajo el último medio. Usar segmentos/importes congelados y todos los pagos pertinentes. Verificado en código, sin emitir documentos reales. [dteService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:73), [dteService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:119).

**Portal público e integración con el backoffice**

Los siguientes hallazgos se sustentan en el flujo PHP inspeccionado. No se ejecutaron compras ni reservas contra la base compartida para demostrarlos.

28. **Alta — El portal no comprueba la capacidad total y permite asientos nulos para adultos.** Solo contrasta asientos explícitos con los ocupados. `asientos: [null]` supera esa comprobación, aunque haya reservas del backoffice sin asiento asignado. Tampoco cuenta pasajeros contra `total_capacity` ni contra el cupo de clase. El bloqueo del vuelo evita carreras, pero no reemplaza una regla de capacidad. Además, sin configuración física usa 20 filas × 6 columnas, independiente del avión. Centralizar disponibilidad con el backend. [crear_reserva.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/php/crear_reserva.php:317), [crear_reserva.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/php/crear_reserva.php:403).

29. **Alta — Las reservas web omiten el cálculo y la persistencia de impuestos del backoffice.** PHP cobra `flight_fares.price` más extras fijos sin consultar `tax_rules` ni insertar `reservation_tax_lines`. Node trata esa tarifa como base neta y suma impuestos. El generador DTE declara que, sin líneas fiscales, no incorpora impuestos. Por tanto, con reglas activas, ambos canales calculan y facturan de manera distinta. Compartir cotización y congelación de líneas fiscales. [crear_reserva.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/php/crear_reserva.php:394), [taxService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/taxService.js:5), [dteService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:79).

30. **Alta — El portal usa tarifas vencidas o un precio base cuando la clase no tiene tarifa vendible.** La consulta no limita `valid_from`/`valid_to`; si no encuentra tarifa, usa `base_price` incluso para clases superiores. Tampoco aplica `seats_allocated`. Node sí rechaza una clase sin tarifa vigente. Quitar el fallback para cobrar y aplicar las mismas reglas en ambos canales. [crear_reserva.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/php/crear_reserva.php:355), [crear_reserva.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/php/crear_reserva.php:394).

31. **Alta — El portal suma servicios al cobro sin registrarlos en el inventario de servicios.** Los precios de equipaje/VIP/etc. están escritos en PHP y se agregan al total, pero la transacción solo inserta reserva, pasajeros y segmentos. No crea `reservation_ancillaries` ni descuenta `flight_ancillaries.stock`. La operación no conserva qué servicio debe entregar y los reportes no concilian ese ingreso. Persistir selección, cantidad, precio y stock en la misma transacción. [crear_reserva.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/php/crear_reserva.php:442), [crear_reserva.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/php/crear_reserva.php:665).

32. **Media — La cotización de menores no coincide entre pantallas y servidores.** `NuevaReserva` multiplica el precio adulto por el número de pasajeros; el backend aplica 75% a niños y 10% a infantes. El portal cobra tarifa completa a quienes llevan asiento y no añade tarifa por infantes. Un adulto y un niño con base $100, sin impuestos, muestran $200 en el resumen del backoffice y se guardan por $175; en web se calculan $200. Definir una política única y mostrar la cotización devuelta por el servidor. [NuevaReserva.jsx](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/pages/NuevaReserva.jsx:166), [reservasController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/reservasController.js:86), [crear_reserva.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/php/crear_reserva.php:401).

33. **Media — La portada muestra precios de ejemplo ligados a IDs de aeropuertos reales.** Combina `Estado.aeropuertosDisponibles` con `MOCK.rutas` y `MOCK.vuelos` por ID. En navegador, los destinos cambiaron tras cargar la BD mientras conservaron precios del conjunto ficticio. No son cotizaciones verificadas del destino actual. Obtener el mínimo real por ruta/fecha o mostrar “Consultar”. [index.php](C:/Users/henry/Desktop/Aviacion/Acajutla-Airlines-main-Pagina-web/Acajutla-Airlines-main/index.php:2091).

**Calidad, dependencias y límites de cumplimiento**

34. **Media — La configuración ESLint no puede usarse en una instalación reproducible.** Importa `@eslint/js`, `globals`, plugins y `eslint/config`, pero `package.json` no declara esas herramientas ni un script `lint`. El intento local falla al importar `@eslint/js`. Declarar versiones compatibles e incluir un chequeo de calidad en CI. [eslint.config.js](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/eslint.config.js:1), [package.json](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/package.json).

35. **Prioridad de actualización alta — Hay dependencias señaladas por npm.** Backend: 9 entradas, incluyendo `axios`, `proxy-addr`, `qs` y cadenas de dependencias de desarrollo. Frontend: 15, incluyendo Vite/esbuild, PostCSS, React Router y cadenas de Tailwind/ExcelJS. No equivalen a 24 ataques explotables en esta aplicación: varias corresponden al servidor de desarrollo o requieren condiciones que no se comprobaron. Evaluar actualizaciones y regresiones; no ejecutar `npm audit fix --force` sin revisar cambios mayores. Se conservaron los dos JSON completos con avisos, rangos y enlaces a fuentes.

36. **Limitación de entrega — El sistema fiscal y los cobros son simuladores.** El código genera sellos aleatorios y aprueba pagos mediante respuestas simuladas. Cambiar `DTE_AMBIENTE` a `01` no integra una firma o transmisión real; puede cambiar las etiquetas de salida sin cambiar el motor simulado. El botón de QA se llama “Simular lote” y solo incrementa contadores; su checklist marca algunos controles como `ok` por existencia de código o variables, sin verificarlos. Sirve como demostración académica, pero no demuestra homologación, cumplimiento PCI ni aceptación por Hacienda. Bloquear explícitamente una configuración de producción mientras falten las integraciones y derivar QA de resultados verificables. [dteService.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:322), [paymentGateway.js](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentGateway.js:19), [qaController.js](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/qaController.js:22).

**Otras observaciones para la entrega**

- La renovación de sesión está incompleta en el backoffice: solo guarda el access token; el método `refreshToken()` no envía el refresh token exigido por el backend y un 401 redirige al acceso. El usuario puede perder un formulario al vencer la sesión. No se esperó el TTL real de ocho horas para reproducirlo. [api.js](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/services/api.js:20), [AuthContext.jsx](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/context/AuthContext.jsx:47).
- La pantalla de acceso muestra credenciales administrativas de demostración sin condicionar el entorno. Se verificó que aparecen en el navegador; **no** se comprobó que sigan siendo válidas. Eliminarlas del build de producción y revisar que las cuentas reales no usen esas claves. [Login.jsx](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/pages/Login.jsx:71).
- Los campos de acceso usan etiquetas visuales sin asociación `htmlFor`/`id`; la inspección de accesibilidad los presentó como campos sin nombre asociado. Añadir nombres accesibles y después probar teclado/lector de pantalla. No se hizo una evaluación completa de accesibilidad.
- Hay una copia antigua de `crear_reserva.php` dentro de `Acajutla_Airlines/php/` que confía en importes del cliente y marca `paid`, pero le falta su `conexion.php` relativo en este árbol. Actualmente no constituye un bypass funcional demostrado. Retirarla del contenido desplegable para evitar que una restauración futura reactive el flujo antiguo.

**Lo que sí se verificó correctamente**

La compilación y las regresiones previas pasan. Una solicitud sin token recibe 401 y un cliente no puede listar todas las reservas. La autenticación interna del checkout tiene una prueba de secreto compartido. Las regresiones cubren saldo de pagos, reembolsos acumulados, prevención de doble DTE para una misma reserva, cancelación/expiración y eventos fiscales simulados. MySQL tiene triggers `BEFORE UPDATE` y `BEFORE DELETE` para auditoría, aunque no se intentó modificarlos. En los conteos consultados no aparecieron reservas `paid` con saldo pendiente ni segmentos ya registrados en check-in/embarque con saldo.

**Estándares usados como referencia y alcance pendiente**

Se usó [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) como referencia general de controles de seguridad. El acceso a reservas/pasajeros ajenos corresponde al problema descrito por [OWASP API1:2023 — autorización por objeto](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/). No se completó una matriz ASVS por nivel ni una certificación. La revisión fiscal comprobó coherencia del código con sus propios validadores y documentación; falta verificar esquemas oficiales vigentes y aceptación en el ambiente autorizado correspondiente.

Quedan pendientes: un ciclo integral con una BD desechable y datos semilla; compras y cancelaciones completas desde cada interfaz; concurrencia real sobre los dos canales; pruebas de carga y recuperación; entrega de correo en un buzón de pruebas; despliegue y TLS; accesibilidad completa; restauración de respaldos; integración de pago real e integración fiscal real si forman parte del alcance del producto. La BD compartida y el proveedor de correo estaban configurados, por lo que no se arrancó el backend normal: su inicio ejecuta automáticamente el job que expira reservas.

**Orden recomendado de corrección**

1. Cerrar el acceso a datos ajenos y la fuga de auditoría; reparar los tres fallos de MFA y el tratamiento de errores SQL.
2. Reparar asientos, unión de pasajeros, rol de copiloto y reglas de estados/saldo.
3. Unificar creación de reservas, cotización, impuestos, capacidad y servicios entre PHP y Node.
4. Reparar validación de pagos, emisión DTE y correlativos concurrentes; mantener explícito el modo simulado.
5. Actualizar dependencias, habilitar lint/CI y ejecutar pruebas integrales y de concurrencia antes de aprobar la entrega.

**Evidencia y reproducción**

Desde `C:\Users\henry\Desktop\Aviacion`:

```powershell
npm test
node backend/pruebas/qa-audit-2026-10-12.cjs
node backend/docs/qa-2026-10-12/db-readonly.cjs
```

El segundo comando debe terminar con código 1 mientras existan los fallos documentados; no se añadió a `npm test` para no cambiar silenciosamente el flujo existente. El tercero utiliza las credenciales locales exclusivamente para consultas de solo lectura. Los resultados reflejan la fecha de ejecución; pueden variar si cambia el código, el esquema, la configuración o el registro de dependencias.

- [Pruebas adicionales](C:/Users/henry/Desktop/Aviacion/backend/pruebas/qa-audit-2026-10-12.cjs).
- [Resultados JSON](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-2026-10-12/acceptance-results.json) y [salida completa](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-2026-10-12/acceptance-output.txt).
- [Evidencia SQL de solo lectura](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-2026-10-12/db-readonly.json).
- [Audit backend](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-2026-10-12/npm-audit-backend.json) y [audit frontend](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-2026-10-12/npm-audit-frontend.json).
