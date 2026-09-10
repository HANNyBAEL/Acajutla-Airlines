# MANUAL DE USUARIO — Backoffice SkyManager
Acajutla Airlines · v1.0 · 2026-09-09

## Ingreso
1. Abrir el backoffice y entrar con usuario y contraseña (ej. admin / Admin123).
2. Roles admin/cajero reciben código MFA por correo; ingresarlo para continuar.

## Módulos
### Dashboard
KPIs en vivo: vuelos del día, pasajeros 24 h, ocupación, ventas, salud fiscal y alerta crítica de contingencia >24 h.

### Clientes
Alta con DUI/NIT/Pasaporte (valida duplicados) y búsqueda escrita por nombre, documento o email.

### Nueva Reserva
1. Seleccionar cliente o registrar uno nuevo.
2. Buscar vuelo por origen/destino/fecha y elegirlo (muestra asientos disponibles).
3. Cargar pasajeros (tipo, documento, nacimiento, nacionalidad).
4. Crear: genera PNR de 6 caracteres con time limit de 30 min y correo de confirmación.

### Vuelos
Crear, cancelar (con confirmación si hay reservas) y reprogramar (valida turnaround RN-OP-02).

### Pagos
- Cobros pendientes: cobrar con tarjeta/transferencia/efectivo eligiendo tipo de DTE (FE/CCFE).
- Al aprobarse se emite el DTE y se envía correo con PDF y JSON.
- Confirmar transferencias y reembolsar con motivo.

### Facturación DTE
Emitir FE/CCFE sobre reservas pagadas, ver JSON (Anexo II) y descargar PDF con QR y sello.

### Notas NCE/NDE
Ajustar FE/CCFE sellados indicando origen, motivo y monto; relaciona automáticamente el documento original.

### Contingencia DTE
Emitir DTE en contingencia, transmitir evento (plazo 24 h) e invalidar DTE con motivos CAT-024 y plazos legales.

### Check-in / Embarque
Por PNR: asignar asiento (mapa con filas de emergencia restringidas), check-in, pase de abordar y abordaje. Por vuelo: manifiesto y cierre (RN-OP-01).

### Comercial / Waitlist
Lista de espera por vuelo con estados, catálogo de ancillaries con stock por vuelo y reportes comerciales.

### Operaciones
Tripulación con licencias y descanso mínimo, clases tarifarias con multiplicador, infraestructura de aeropuertos, parámetros de configuración y trazabilidad DTE.

### Correos
Bandeja de salida con estados (enviado/simulado/fallido) y reenvío.

### Reportes y Auditoría
Ingresos, ocupación, conciliación fiscal exportable a CSV y bitácora inmutable de acciones.