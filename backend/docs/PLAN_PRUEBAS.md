# Plan de Pruebas — SkyManager (Acajutla Airlines)

## 1. Pruebas Funcionales
- Auth: login válido/inválido, MFA, bloqueo por intentos, roles y permisos por matriz SRS §5.
- Reservas: crear (PNR 6 chars), time-limit libera inventario, cancelación con reembolso, waitlist.
- Pagos: contado/transferencia/efectivo, confirmación, reembolso parcial/total, estados.
- DTE: FE/CCFE/FEXE/FSEE/NCE/NDE con estructura Anexo II; sello simulado; representación gráfica con QR.
- Eventos: invalidación (plazos 3 meses / 10 días hábiles), contingencia (24h/72h), retorno (3 meses, ≤50 DTE, suma ≤ valor).

## 2. Pruebas de Integración
- Reserva → Pago → DTE → Correo → Representación gráfica (flujo extremo a extremo).
- Reembolso → Evento de Retorno → ajuste de totales.
- Contingencia → Evento → lote de transmisión → sellos.

## 3. Pruebas de Seguridad
- Rate-limit en /api/auth (15 req/min/IP) → 429.
- Enmascaramiento PII en visor DTE y auditoría (utils/masking.js).
- Bitácora inmutable: UPDATE/DELETE sobre audit_logs deben fallar (triggers).
- Firmado HMAC opcional (SIGNATURE_REQUIRED=true).

## 4. Pruebas Fiscales (Manual XXIV)
Metas mínimas de transmisión satisfactoria por tipo (tracker en /api/qa/pruebas):
FE 90, CCFE 75, NRE 50, NCE 50, NDE 25, CRE 50, CLE 75, DCLE 50, FEXE 90, FSEE 25, CDE 25; eventos 5 c/u.

## 5. Pruebas de Carga
- Búsqueda de vuelos < 2 s bajo carga normal (RNF-002). Simular 3x carga base.