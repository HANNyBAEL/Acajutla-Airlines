# DOCUMENTACIÓN TÉCNICA — SkyManager
v1.0 · 2026-09-09

## Arquitectura
Monolito modular Node.js + Express + MySQL (Aiven) · Frontend backoffice React+Vite+Tailwind · Portal público separado.
Flujo DTE: reserva paid → builder JSON (Anexo II) → firma simulada → transmisión simulada MH → sello → representación gráfica PDF (pdfkit+qrcode) → correo Brevo con adjuntos.

## Estructura backend
src/app.js · config/(db, brevo) · controllers/ · routes/ · services/(dteService, dteEventosService, dteExportService, notasService, fiscalCompliance, rgPdfService, mailerService, paymentService, paymentGateway) · middleware/(auth, audit, rateLimiter, paymentValidator) · models/ · utils/(pnrGenerator, masking).

## Principales tablas
users, employees, customers, passengers, airports, aircraft_types, aircraft, routes, flights, reservations, flight_segments, payments, dte_headers, dte_items, contingency_events, contingency_event_docs, dte_invalidation_events, fiscal_events, email_outbox, waitlist, ancillaries, flight_ancillaries, reservation_ancillaries, crew_members, flight_crew, fare_classes, flight_fares, airport_facilities, config_params, dte_trace, audit_logs, dte_transmission_tests.

## Endpoints principales (prefijo /api)
auth(login, verificar-mfa, perfil) · vuelos(buscar, crear, cancelar, reprogramar) · reservas · pasajeros · pagos(procesar, confirmar, reembolsar) · dte(emitir, :uuid/pdf, :uuid/json) · dte-eventos(pendientes, evento-contingencia, invalidar) · notas · dte-export · fiscal(aplicar, evento-retorno, validar-invalidacion) · comercial(waitlist, ancillaries, reportes, kpi) · operaciones · correos · reportes · auditoria · qa.

## Seguridad
JWT + refresh + MFA · roles (admin, operations, cashier, airport_staff, customer, corporate_agent, auditor) · rate limiting por IP · masking de PII · auditoría inmutable por triggers · validación Luhn y PCI-DSS (sin CVV/PAN).

## Cumplimiento fiscal
JSON Anexo II V2.0 (FE V2, CCFE V4, NCE/NDE V4, FEXE V3, FSEE V2) · eventos Anexo III (invalidación V3, contingencia V3, retorno V1) · número de control 31 chars · redondeo 8/2 decimales con holgura ±0.01 · CAT-005/016/017/022/024/027/028/031/033.

## Variables de entorno
DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, REFRESH_SECRET, JWT_EXPIRES_IN, BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME, DTE_AMBIENTE, DTE_NIT, DTE_NRC, CORS_ORIGIN, RATE_LIMIT_DISABLED, SIGNATURE_REQUIRED, BACKUP_ENABLED.