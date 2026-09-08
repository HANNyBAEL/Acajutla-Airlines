# Documentación Técnica — SkyManager

## Arquitectura
Monolito modular: Node.js + Express + MySQL (Aiven). Frontend backoffice React+Vite+Tailwind. Portal público separado (equipo 2).

## Módulos backend (rutas /api)
auth, usuarios, empleados, clientes, aeropuertos, aeronaves, vuelos, reservas, pasajeros, pagos, dte, dte-export, eventos (invalidación/contingencia/retorno), notas (NCE/NDE), comercial (waitlist/ancillaries), correos, qa, auditoria.

## Modelo de datos (clave)
users, employees, customers, passengers, airports, aircraft_types, aircraft, routes, flights, reservations, flight_segments, payments, dte_headers, dte_items, dte_related_docs, contingency_events, waitlist, reservation_services, audit_logs, dte_transmission_tests.

## Seguridad
JWT + MFA; matriz de roles; rate-limit; masking PII; triggers de inmutabilidad en audit_logs; firmado HMAC opcional.

## Fiscales
Generación JSON según Anexo II (FE V2, CCFE V4, FEXE V3, FSEE V2, NCE/NDE V4) y eventos Anexo III (Invalidación V3, Contingencia V3, Retorno V1). Redondeo 8 decimales cuerpo / 2 decimales resumen, holgura ±0.01. Número de control 31 chars. Firma simulada + selloRecibido.