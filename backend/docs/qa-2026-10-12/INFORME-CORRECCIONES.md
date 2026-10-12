# Informe de correcciones y cierre de QA

Fecha: 12 de octubre de 2026. Este documento complementa `INFORME.md`, que conserva la evidencia histórica de la auditoría inicial.

El sistema queda configurado como una simulación académica. El ambiente DTE está fijado en `00`, los QR y comprobantes llevan la leyenda de simulación, y se bloquean destinos HTTP fiscales externos. No hay integración ni llamada al Ministerio de Hacienda. El único servicio externo permitido por el guard de red es el correo transaccional de Brevo, cuando se configura expresamente.

## Resultado comprobable

- `npm test` en la raíz: correcto; sintaxis de 139 archivos backend, 23 regresiones de lógica, 16 eventos DTE, checkout, pagos, QR, límite de simulación, lint y build.
- Pruebas de aceptación aisladas: **26/26**; BD, correo y pasarela sustituidos por dobles, sin escrituras.
- PHP: `php -l` correcto en los 22 archivos del portal, incluidos reserva, búsqueda de vuelos y pagos web.
- MySQL: `SELECT 1` correcto con TLS y CA verificada; no se ejecutaron mutaciones durante QA.
- Auditoría de dependencias backend: 0 vulnerabilidades después de retirar `nodemon` y usar `node --watch`.
- Auditoría frontend: permanecen 13 alertas transitivas (6 altas, 7 moderadas) asociadas a Vite/Tailwind y su cadena de desarrollo; el arreglo automático exigiría saltos mayores y se conserva el build verificado.

## Hallazgos corregidos

1. MFA importa `node:crypto`, genera códigos de seis dígitos, reinicia `used`, calcula vencimientos con reloj SQL y consume el código con un `UPDATE` atómico.
2. Bloqueo de cuenta usa `blocked_until`, umbral de cinco intentos, se comprueba antes de login y nuevamente antes de emitir tokens MFA. Los refresh tokens usan `DATE_ADD(NOW())` y JWT IDs únicos.
3. Los rate limiters tienen almacenes independientes; el bypass solo existe con `NODE_ENV=test`.
4. Las rutas de reserva, pasajeros y directorio de clientes exigen roles de personal; se eliminó el acceso de clientes a datos ajenos.
5. La auditoría clasifica la clave antes del tipo de dato y oculta PAN, CVV y documentos numéricos.
6. MySQL exige TLS verificado y usa la CA del proyecto. La conexión ya no se abre al importar módulos.
7. Fiscalidad propaga rechazos a Express; una falla SQL devuelve 500 controlado.
8. Se corrigieron SQL ambiguo, unión pasajero-asiento, roles `copilot`, pago completo para check-in, estados de vuelo, límites físicos de asientos y tripulación activa con horarios/licencias.
9. Servicios auxiliares validan reserva, pasajero, vuelo, estado, factura e inventario; las actualizaciones de catálogo son parciales y validadas.
10. Tarjetas, transferencias y reembolsos simulados validan formato, vencimiento y referencias; las respuestas son deterministas y no contactan proveedores de cobro.
11. DTE/CCFE/notas/exportaciones usan las versiones del catálogo interno, cantidad obligatoria y validación completa. La emisión serializa correlativos con `GET_LOCK`, distribuye tarifas y medios de pago guardados y conserva el ambiente `00`.
12. El portal PHP usa tarifas vigentes y cupos de clase, capacidad de aeronave, factores adulto/niño/bebé, impuestos congelados y catálogo de servicios con stock persistido. No acepta precio enviado por el navegador ni asiento nulo para pasajeros con asiento.
13. El backoffice calcula el mismo factor de pasajeros, mantiene refresh token en sesión y renueva automáticamente ante 401. Se quitaron credenciales demo visibles y se corrigieron etiquetas de formularios.
14. La portada dejó de asociar precios mock a aeropuertos reales; muestra “Consultar” hasta tener una cotización real.
15. Se añadió lint reproducible y una prueba de frontera que falla si aparece una URL fiscal externa.
16. Operaciones ahora muestra el historial de tripulación, clases tarifarias e infraestructura. Sus eliminaciones solo se permiten sin asignaciones, tarifas o vuelos relacionados; cuando existe historial, la API devuelve `409` y la interfaz deshabilita el botón. También quedó operativa la actualización de estado de infraestructura.

## Límites conocidos

El catálogo DTE es el contrato interno de la simulación y no certifica cumplimiento fiscal real. Las alertas frontend de `npm audit` son de herramientas/transitivas; requieren una migración mayor coordinada de Vite/Tailwind para eliminarlas sin romper el build. El checkout web y correo se probaron con dobles; no se efectuaron cobros, envíos ni cambios de negocio contra datos reales.
