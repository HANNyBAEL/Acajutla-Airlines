# Manual de Usuario — Backoffice SkyManager

## Ingreso
Usuario/contraseña + MFA para roles admin/financieros. Bloqueo tras intentos fallidos.

## Módulos
- Dashboard: KPIs operativos/comerciales/fiscales en tiempo real.
- Vuelos: crear, cancelar, reprogramar (RN-OP-02 turnaround).
- Reservas: crear (PNR), consultar, cancelar, waitlist.
- Pagos: cobrar, confirmar transferencia, reembolsar.
- Facturación DTE: emitir FE/CCFE/FEXE/FSEE, ver JSON y PDF con QR.
- Notas: NCE/NDE relacionando documento original.
- Eventos: invalidación, contingencia, retorno con plazos legales.
- Comercial: waitlist y ancillaries (equipaje, asiento, abordaje).
- Auditoría: bitácora inmutable de acciones críticas.
- Cierre QA: progreso de pruebas de transmisión y checklist de seguridad.

## Flujo típico de venta
1) Nueva Reserva → 2) Pago → 3) Emitir DTE → 4) Correo al cliente → 5) PDF/QR.