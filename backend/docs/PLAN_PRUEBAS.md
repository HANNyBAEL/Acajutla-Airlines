# PLAN DE PRUEBAS — SkyManager (Acajutla Airlines)
Versión 1.0 · Fecha: 2026-09-09 · Responsable: QA (M. Canales / D. Ramírez)

## 1. Alcance y metodología
- Pruebas funcionales por módulo, integración extremo a extremo, seguridad y carga.
- Ejecución: manual asistida + script automatizado `node pruebas/smoke-test.js`.
- Criterio de aceptación general: resultado esperado sin errores 500 y con auditoría registrada.

## 2. Pruebas funcionales
| ID | Módulo | Caso | Resultado esperado | Ref |
|----|--------|------|--------------------|-----|
| PF-01 | Auth | Login válido admin/Admin123 | Token JWT + redirect dashboard | RF-001 |
| PF-02 | Auth | Login inválido | 401 + contador de intentos | RNF-003 |
| PF-03 | Auth | MFA rol admin/cajero | Código al correo y verificación | RF-001 |
| PF-04 | Reservas | Crear reserva con 2 pasajeros | PNR 6 chars, estado pending, time_limit 30 min | RF-002, RN-COM-01/02 |
| PF-05 | Reservas | Reserva sin cupo | 409 con asientos disponibles | RN-COM-03 |
| PF-06 | Reservas | Cancelar reserva | Estado cancelled + libera segmentos | CU-001 |
| PF-07 | Vuelos | Crear vuelo | Alta con ruta auto | CU-006 |
| PF-08 | Vuelos | Crear vuelo sin turnaround | 409 RN-OP-02 | RN-OP-02 |
| PF-09 | Vuelos | Cancelar con reservas | 409 requiere confirmación | CU-006 |
| PF-10 | Vuelos | Reprogramar cancelado | Vuelve a scheduled con observación | CU-006 |
| PF-11 | Pagos | Cobro tarjeta 4111... | approved, reserva paid | RF-002 |
| PF-12 | Pagos | Transferencia + confirmar | pending_confirmation → approved | RF-002 |
| PF-13 | Pagos | Reembolso con motivo | Pago refund + ajusta paid_total | CU-001 |
| PF-14 | DTE | Emitir FE reserva paid | accepted + sello + full_json | RF-002 |
| PF-15 | DTE | Emitir CCFE sin NIT | 400 RN-FIS-02 | RN-FIS-02 |
| PF-16 | DTE | PDF representación gráfica | PDF con QR, sello y campos A/B/D | RF-002 |
| PF-17 | NCE/NDE | NCE sobre FE sellada | documentoRelacionado obligatorio | RN-FIS-04 |
| PF-18 | FEXE | País receptor = SV | 400 RN-FIS-05 | RN-FIS-05 |
| PF-19 | Contingencia | Emitir en contingencia | tipoOperacion 2, sin sello | RF-003 |
| PF-20 | Contingencia | Transmitir evento | Sello al evento y a los DTE | RF-003 |
| PF-21 | Invalidación | Fuera de plazo FE (>3 meses) | Bloqueado con mensaje | CU-003 |
| PF-22 | Retorno | Retorno sobre FE sellada | Evento sellado, suma ≤ valor DTE | Manual X |
| PF-23 | Check-in | Asiento fila emergencia a menor | 400 RN-OP-03 | RN-OP-03 |
| PF-24 | Check-in | Cerrar vuelo con checked-in | 409 RN-OP-01 | RN-OP-01 |
| PF-25 | Comercial | Waitlist en vuelo lleno | Posición asignada | Q15 |
| PF-26 | Comercial | Ancillary sin stock | 409 sin stock | Q34 |
| PF-27 | Correos | Cobro con DTE | Correo con PDF+JSON (simulado o Brevo) | RF-002 |

## 3. Pruebas de integración
| ID | Flujo | Verificación |
|----|-------|--------------|
| PI-01 | Reserva → Pago → DTE → Correo | PNR → paid → DTE sellado → outbox sent/simulado |
| PI-02 | Pago transferencia → confirmar → DTE | DTE emitido al confirmar |
| PI-03 | Reembolso → Evento de Retorno | Evento relacionado al DTE |
| PI-04 | Contingencia → evento → lote | DTE pasan a accepted con sello |

## 4. Pruebas de seguridad
| ID | Caso | Esperado |
|----|------|----------|
| PS-01 | Request sin token | 401 |
| PS-02 | Rol cajero en /auditoria | 403 |
| PS-03 | >100 req/15min mismo IP | 429 |
| PS-04 | UPDATE/DELETE audit_logs | Bloqueado por trigger (RNF-006) |
| PS-05 | Datos sensibles en logs | Enmascarados (masking) |

## 5. Pruebas fiscales (Manual XXIV)
Mínimos de transmisión satisfactoria por tipo (tracker en /qa/pruebas):
FE 90 · CCFE 75 · NRE 50 · NCE 50 · NDE 25 · CRE 50 · CLE 75 · DCLE 50 · FEXE 90 · FSEE 25 · CDE 25 · Eventos 5 c/u.

## 6. Pruebas de carga
- Búsqueda de vuelos < 2 s con carga normal (RNF-002). Simulación 3x con script.

## 7. Ejecución automatizada
`node pruebas/smoke-test.js` (requiere backend corriendo y usuario admin).