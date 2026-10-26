# Auditoría de lógica: backend y frontend-backoffice

Fecha: 14 de octubre de 2026, America/El_Salvador.

**Informe histórico de detección. Los doce hallazgos fueron corregidos después
de esta auditoría. Consultar [CORRECCIONES.md](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-logica-2026-10-14/CORRECCIONES.md)
para el estado actual. Los resultados iniciales se conservan en
[resultados-iniciales.json](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-logica-2026-10-14/resultados-iniciales.json).**

**40 escenarios ejecutados: 17 aprobados y 23 fallidos, agrupados en 12 problemas de lógica.**
La aprobación de la batería anterior no cubría estos casos. Este informe aporta
reproducciones nuevas de reglas de negocio, cálculos y transiciones de estado.
Los 23 fallos no representan 23 causas independientes.

Se añadieron una suite específica, el comando `npm run test:logic` y esta evidencia.
No se corrigieron las funciones de la aplicación durante esta auditoría.

## Método y límites

- Se ejecutan los controladores, servicios y cálculos reales del backend.
- La base se sustituye por datos en memoria y respuestas SQL explícitas; las
  transacciones simuladas restauran los datos ante rollback. Una consulta no
  contemplada provoca un error del arnés, no una respuesta favorable por defecto.
- Se transforma el código real del backoffice y se invocan sus componentes y
  manejadores de eventos, con estado React y transporte HTTP simulados. En el
  formulario se capturó el payload real que intenta enviar el manejador.
- No se abrió la base configurada, no se inició el servidor, no se enviaron
  correos y no se contactaron proveedores. No se usó el portal PHP.
- Esto no prueba restricciones reales de MySQL, concurrencia entre conexiones,
  migraciones, comportamiento visual del navegador o integración completa.
- Los casos positivos comprueban que el arnés acepta operaciones válidas: tarifa
  sin discrepancias, emisión DTE consistente, reserva pagada con tripulación,
  renovación válida de sesión y mapa de seis plazas, entre otros.

## Hallazgos y reproducción

### L01 — Alta: los importes guardados pueden impedir facturar una venta pagada

Con tarifa neta de **$10.10, dos niños y sin impuestos**, la reserva guarda
**$15.15** y sus segmentos suman **$15.14** en el runtime probado. El total se
redondea después de sumar, mientras cada segmento se redondea individualmente;
la representación binaria del número también afecta los medios centavos.
El servicio DTE real rechaza esa reserva pagada con
«Las tarifas, servicios e impuestos guardados no concilian con la reserva».

También fallan tres niños a esa tarifa, dos infantes sobre $10.05 y cinco infantes
sobre $0.01. El caso equivalente con tarifa $100 sí permite emitir el DTE.

Reproducción manual: en una base de pruebas, establecer la tarifa y ausencia de
impuestos indicadas, crear la reserva con dos niños, pagar el total y emitir FE.
Esperado: total, segmentos, impuestos y documento concilian al centavo.
Corrección sugerida: definir una política única de redondeo, persistir los
importes finales de cada línea y obtener el total sumando exactamente esas líneas.

Evidencia: `ROUND-10.1-child-2`, `ROUND-10.1-child-3`,
`ROUND-10.05-infant-2`, `ROUND-0.01-infant-5`, `DTE-10.1`.
Código: [cálculo del total](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/reservasController.js:87),
[importe del segmento](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/reservasController.js:135),
[conciliación DTE](C:/Users/henry/Desktop/Aviacion/backend/src/services/dteService.js:121).

### L02 — Alta: un ID recibido puede sustituir el del pasajero recién creado

Al crear un pasajero que incluye `id: 999`, la inserción de pasajeros devuelve
el ID 10, pero el segmento se intenta guardar con `passenger_id = 999`.
La expansión `{ id: resultPax.insertId, ...pax }` permite sobrescribir el ID nuevo.

Reproducción por API autenticada: añadir un campo `id` a uno de los pasajeros
de `POST /api/reservas`. Esperado: ignorar ese ID y relacionar el segmento con el
pasajero recién creado. La prueba verifica los argumentos reales de escritura.
Si el ID enviado no existe, MySQL puede rechazar la FK; la persistencia de una
relación ajena dependerá de las restricciones del esquema y de que ese ID exista.
No se ejecutó esa escritura en una BD real.

Corrección sugerida: construir los datos permitidos explícitamente y usar siempre
el ID generado por la inserción.
Evidencia: `RES-ID`.
Código: [pasajerosCreados](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/reservasController.js:127).

### L03 — Alta: el backend acepta tarifa de infante para un adulto

Un pasajero con nacimiento `1990-01-01` y `passenger_type: "infant"` obtiene
una reserva de **$10 sobre tarifa adulta de $100**, con HTTP 201. El servidor
confía en el tipo recibido al aplicar el factor. El backoffice calcula el tipo
desde la fecha y deshabilita el selector, pero una petición directa puede enviar
la contradicción.

Reproducción por API autenticada: enviar ambos campos contradictorios al crear
una reserva. Esperado: rechazar la contradicción o calcular el tipo en el servidor,
con una fecha de referencia definida por la política comercial.
Evidencia: `RES-EDAD`.
Código: [factor de pasajero](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/reservasController.js:86).

### L04 — Alta: un abono vencido bloquea el saldo y retiene el asiento

Secuencia ejecutada: reserva pendiente de $100 → pago real del servicio simulado
por $1 → estado `confirmed` → vencimiento → intento de pagar $99 rechazado → job
de expiración. El job solo recoge `pending`; la reserva permanece `confirmed` y
el segmento se conserva. Check-in también exige liquidación completa.

Reproducción manual: crear una reserva de prueba con plazo corto, abonar una
parte, dejar vencer el plazo e intentar liquidar. Esperado: una política coherente
que permita completar el pago o resuelva el vencimiento, abono e inventario.
La situación actual requiere intervención manual para salir del bloqueo.

Evidencia: `EXP-1`, con `EXP-0` como control positivo.
Código: [pago parcial](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentService.js:69),
[selección de vencidas](C:/Users/henry/Desktop/Aviacion/backend/src/services/expiracionService.js:11).

### L05 — Alta: cancelación y expiración no recuperan el inventario de servicios

Secuencia ejecutada: stock 3 → agregar 2 servicios a reserva sin pagar → stock 1
→ cancelar o expirar. La reserva alcanza su estado terminal, pero el stock sigue
en 1 y los dos servicios permanecen `active`. Los reportes de servicios que
filtran por ese estado pueden seguir considerándolos vendidos.

Reproducción manual: agregar servicios con stock a una reserva pendiente y luego
cancelarla; repetir con una reserva que expire. Esperado: restaurar las unidades
no consumidas y cancelar sus líneas de forma atómica e idempotente.
Evidencia: `STOCK-cancelar`, `STOCK-expirar`; `STOCK-LIMITE` prueba el rechazo por
stock insuficiente.
Código: [descuento de inventario](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/comercialController.js:153),
[cancelación](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/reservasController.js:214),
[expiración](C:/Users/henry/Desktop/Aviacion/backend/src/services/expiracionService.js:1).

### L06 — Alta: check-in acepta un asiento previo inválido o inadecuado para un menor

Un segmento pagado de un niño con asiento previo `12A` recibe pase de abordar.
También lo recibe con `99F` en un avión de 90 plazas. `hacerCheckin` solo busca
un asiento si falta uno; no revalida el existente contra capacidad ni edad.
El endpoint de asignación explícita sí rechaza `99F` en el control positivo.

Reproducción: preparar un segmento de prueba con el asiento previo indicado,
reserva pagada y tripulación válida; solicitar check-in. Estos casos precargados
representan datos previos o cambios de aeronave; la prueba de `99F` no implica
que el endpoint normal de asignación permita crear ese asiento. La creación de
reservas admite asientos explícitos y tampoco aplica la regla de emergencia.

Esperado: aplicar todas las reglas del asiento también al confirmar check-in.
Evidencia: `CHECKIN-ASIENTO-99F`, `CHECKIN-ASIENTO-12A`.
Código: [asiento existente](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/checkinController.js:170).

### L07 — Media: cambiar asiento conserva un pase de abordar desactualizado

Secuencia ejecutada: check-in en `1A` genera `BP-QA0001-1A`; cambiar a `2B`
responde HTTP 200 y modifica el asiento, pero conserva el código anterior.
El backoffice ofrece el botón «Asiento» incluso después de check-in.

Reproducción manual: hacer check-in, cambiar asiento y volver a abrir el pase.
Esperado: regenerar el pase y retirar el anterior, o bloquear el cambio según
la política operativa. Evidencia: `ASIENTO-PASE`.
Código: [actualización de asiento](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/checkinController.js:120).

### L08 — Alta: se puede embarcar después de devolver todo el pago

Secuencia ejecutada con servicios reales: reserva pagada → check-in → reembolso
de $100 → `paid_total = 0`, reserva `pending` → embarque HTTP 200 y `boarded`.
El reembolso no revoca el check-in y el embarque solo comprueba `checkin_status`.
También acepta segmentos precargados en check-in de vuelos `cancelled` o
`completed`; esos dos casos no prueban que la cancelación ordinaria conserve
segmentos, sino la falta de validación en el endpoint final.

Reproducción manual principal: en datos de prueba, hacer check-in, reembolsar el
total desde Pagos y pulsar Abordar. Esperado: rechazar el embarque sin pago y
revalidar estado de vuelo y reserva en la misma operación.
Evidencia: `EMBARQUE-REEMBOLSO`, `EMBARQUE-VUELO-cancelled`,
`EMBARQUE-VUELO-completed`.
Código: [reembolso](C:/Users/henry/Desktop/Aviacion/backend/src/services/paymentService.js:169),
[embarque](C:/Users/henry/Desktop/Aviacion/backend/src/controllers/checkinController.js:192).

### L09 — Media: el mapa del backoffice habilita plazas inexistentes

Con capacidad 2, el componente genera botones habilitados `1C`, `1D`, `1E` y
`1F`. Con 74 plazas, habilita `13C`–`13F`. El backend devuelve la lista física
correcta en `asientos`, pero el componente dibuja filas completas de seis plazas.
Una aeronave de seis plazas supera el control positivo.

Reproducción manual: abrir el mapa de un avión cuya capacidad no sea múltiplo
de seis. Esperado: mostrar o habilitar únicamente IDs incluidos en `mapa.asientos`.
El backend rechaza la asignación inexistente; el fallo observado está en la
selección que ofrece la interfaz.
Evidencia: `UI-MAPA-2`, `UI-MAPA-74`.
Código: [botones del mapa](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/pages/Checkin.jsx:230).

### L10 — Alta: una segunda reserva puede usar silenciosamente al cliente anterior

Secuencia ejecutada en los manejadores reales: cliente 77 → pantalla de éxito
→ «Crear otra reserva» → cliente visible `null` → completar únicamente pasajero
y vuelo → guardar. Se captura **POST /reservas con customer_id = 77**.
El botón limpia `clienteSel`, pero conserva `clienteId`; la validación lo acepta.

Reproducción manual: crear una reserva, pulsar «Crear otra reserva», completar
vuelo y pasajero sin seleccionar cliente y guardar. Esperado: exigir una nueva
selección de cliente. Corrección sugerida: limpiar ambos estados y todas las
referencias del formulario al iniciar otra reserva.
Evidencia: `UI-OTRA-RESERVA`.
Código: [reinicio del formulario](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/pages/NuevaReserva.jsx:211).

### L11 — Media: recargar con token de acceso vencido pierde una sesión renovable

Ante un 401 de `/auth/perfil`, el interceptor no intenta renovar porque excluye
todas las rutas que contienen `/auth/`. La carga inicial del perfil elimina ambos
tokens al fallar. Con `/pagos`, el mismo refresh token sí se usa correctamente.

Reproducción manual: en un entorno de pruebas, tener access token vencido y
refresh token vigente y recargar el backoffice. Esperado: renovar, volver a
consultar el perfil y mantener la sesión. Excluir específicamente login/refresh
evitaría el bloqueo general del perfil.
Evidencia: `UI-REFRESH-PERFIL`; control `UI-REFRESH-OK`.
Código: [condición del interceptor](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/services/api.js:22),
[carga del perfil](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/context/AuthContext.jsx:28).

### L12 — Media: un error de negocio después de renovar cierra la sesión válida

Secuencia ejecutada: petición recibe 401 → renovación exitosa → token nuevo
guardado → petición repetida devuelve 400, 403 o 500. El `catch` captura también
el fallo de ese reintento, borra los tokens y redirige a `/login`.

Reproducción: provocar un access token vencido, renovar correctamente y hacer
que la petición repetida responda con un error de validación o del servidor.
Esperado: conservar la sesión nueva y mostrar el error de la operación. La
gestión del fallo del refresh debe separarse del fallo de la petición repetida.
Evidencia: `UI-REFRESH-RETRY-400`, `UI-REFRESH-RETRY-403`,
`UI-REFRESH-RETRY-500`.
Código: [catch del interceptor](C:/Users/henry/Desktop/Aviacion/frontend-backoffice/src/services/api.js:33).

## Cómo repetir la auditoría

Desde `C:\Users\henry\Desktop\Aviacion`, con las dependencias de ambos proyectos
instaladas:

```powershell
npm run test:logic
```

No requiere iniciar backend ni navegador. En la auditoría inicial finalizó con
**código 1 y 23 FAIL**. Tras las correcciones se esperan **51 PASS y código 0**.
Un PASS significa que el
resultado cumple la regla especificada; un FAIL deja el comportamiento observado.
La suite puede cambiar de resultado cuando se corrijan las funciones.

- [Suite reproducible](C:/Users/henry/Desktop/Aviacion/backend/pruebas/logica-negocio-2026-10-14.cjs).
- [Resultados iniciales estructurados](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-logica-2026-10-14/resultados-iniciales.json).
- [Salida de esta ejecución](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-logica-2026-10-14/salida.txt).

Para las reproducciones manuales, usar una base desechable con datos sintéticos.
El inicio normal del backend activa automáticamente la expiración de reservas.
Arrancar backend y backoffice desde sus propias carpetas para cargar la
configuración correspondiente:

```powershell
# Terminal 1, dentro de backend y con .env apuntando a la base de pruebas
npm run dev

# Terminal 2, dentro de frontend-backoffice
npm run dev
```

Abrir http://localhost:5174 y repetir las secuencias indicadas arriba. Comprobar
el estado persistido además del mensaje de éxito: saldo, estado de reserva,
asiento, código del pase, stock y cliente asociado. La batería general `npm test`
ahora incluye esta suite de lógica junto con las regresiones anteriores.

## Prioridad de corrección

Primero: consistencia de importes, identidad del pasajero/cliente y requisitos de
embarque (L01, L02, L08, L10). Después: tarifas por edad, vencimientos, servicios y
revalidación de asientos (L03–L06). Finalmente: pase al cambiar asiento, mapa y
sesión (L07, L09, L11, L12). Repetir cada caso fallido junto con su control positivo
después de corregirlo; la auditoría no demuestra ausencia de otros defectos.
