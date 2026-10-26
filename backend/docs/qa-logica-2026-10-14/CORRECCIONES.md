# Correcciones de lógica — backend y frontend-backoffice

Fecha: 14 de octubre de 2026.

Se corrigieron los doce hallazgos de la auditoría. La suite conserva los criterios
de los 40 escenarios originales y añade 11 comprobaciones de límites,
operaciones válidas, errores, inventario y sesión.

| Hallazgo | Comportamiento corregido |
|---|---|
| L01 — Importes y DTE | Base e impuestos se calculan por línea en centavos. El total suma esas mismas líneas; el backoffice aplica la misma regla. Dos niños sobre tarifa $10.10 sin impuestos totalizan $15.16, consistente con dos segmentos de $7.58. |
| L02 — ID de pasajero | El ID generado por MySQL prevalece sobre cualquier campo `id` recibido. |
| L03 — Edad y tarifa | El servidor valida nacimiento y categoría usando la fecha civil actual de El Salvador: menor de 2, infante; de 2 a 11, niño; desde 12, adulto. La interfaz usa ese mismo criterio, sin desplazamientos UTC del cumpleaños. |
| L04 — Abonos vencidos | Se expiran también reservas `confirmed` con saldo pendiente. Se liberan asientos y servicios; `paid_total` y el historial de pagos se conservan para reembolso explícito. |
| L05 — Inventario | Cancelar o expirar devuelve las unidades de servicios activos y cancela esas líneas dentro de la transacción. Repetir la devolución no duplica stock. También se aplica al cancelar un vuelo. |
| L06 — Asiento previo | Check-in revalida capacidad y restricciones de emergencia. Crear una reserva con asiento explícito aplica también la regla de edad. |
| L07 — Pase desactualizado | Cambiar asiento solo se permite antes del check-in. La interfaz oculta la acción después; la API también la rechaza. |
| L08 — Embarque y reembolso | Embarque valida pago completo, estado de reserva y vuelo dentro de una transacción. Un reembolso que deja saldo revoca check-in y pase. Se rechazan reembolsos de reservas con pasajeros ya embarcados. |
| L09 — Mapa | La interfaz solo dibuja botones para los IDs presentes en `mapa.asientos`. |
| L10 — Cliente anterior | «Crear otra reserva» limpia el ID y la selección de cliente, además del tipo de viaje y clase. Guardar exige que selección e ID coincidan. |
| L11 — Perfil vencido | Un 401 de `/auth/perfil` puede renovar sesión; login, verificación MFA y refresh quedan excluidos del ciclo automático. |
| L12 — Error tras refresh | El error del reintento se devuelve a la operación con su estado original y conserva los tokens válidos. Los fallos de refresh sí cierran sesión. Varias respuestas 401 comparten una renovación. |

## Validación

- Suite de lógica: **51/51**, incluidos los 40 escenarios originales.
- Aceptación aislada anterior: **26/26**.
- Regresiones previas del backend: **43 comprobaciones aprobadas**.
- Sintaxis del backend, lint configurado y compilación del backoffice: correctos.

La suite detecta consultas no implementadas en sus dobles incluso cuando un
controlador las transforma en HTTP 400/500. Se actualizaron únicamente las
respuestas de las dependencias necesarias para los nuevos accesos SQL y fechas
de pasajeros válidas; los criterios de negocio de los fallos originales se
mantuvieron. Se conservaron los resultados de la auditoría inicial por separado.

## Repetir

Desde la raíz del proyecto:

```powershell
# Solo lógica de negocio
npm run test:logic

# Sintaxis, regresiones, lógica, lint y compilación
npm test

# Aceptación aislada adicional
node backend/pruebas/qa-audit-2026-10-12.cjs
```

Se espera código 0. Resultados actuales:
[resultados.json](C:/Users/henry/Desktop/Aviacion/backend/docs/qa-logica-2026-10-14/resultados.json).

## Alcance de los cambios

No se requieren migraciones de esquema. La creación de reservas ahora exige
fecha de nacimiento válida y coherencia con el tipo enviado. La decisión
comercial conserva los abonos al expirar para permitir su devolución explícita;
no los devuelve automáticamente.

Las pruebas ejecutan funciones, componentes y manejadores reales con SQL y
transporte simulados. No se modificaron datos de la base configurada ni se
enviaron correos. Falta comprobar integración y concurrencia en MySQL y los
recorridos completos en navegador con una base desechable. Las reservas,
inventario o importes históricos que ya sean inconsistentes requieren revisión
de datos; estas correcciones previenen nuevos casos y no reescriben el historial.
