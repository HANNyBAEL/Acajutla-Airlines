# Acajutla Airlines

Sistema de gestión de vuelos con una API Node.js y un backoffice React.

## Estructura

- `backend/`: API, lógica de negocio, migraciones y pruebas de regresión.
- `frontend-backoffice/`: aplicación administrativa React/Vite.
- `Leyes/`: documentación legal y funcional de referencia.
- `backend/docs/`: manuales, plan de pruebas y documentación técnica.

## Comprobación local

Desde la raíz del repositorio:

```sh
npm test
```

Este comando valida la sintaxis JavaScript del backend, ejecuta las pruebas aisladas del backend y compila el backoffice. No modifica la base de datos ni emite documentos fiscales.

También se pueden ejecutar por separado `npm run test:backend`, `npm run check:backend` y `npm run build:backoffice`.

Las pruebas de integración que requieren MySQL, correo o servicios fiscales se ejecutan por separado en un entorno de pruebas configurado para ello.

## Pruebas de lógica de negocio

```sh
npm run test:logic
```

Ejecuta 51 escenarios de reservas, importes, pagos, vencimientos, inventario,
check-in, embarque, formularios y renovación de sesión. Usa funciones reales del
backend y manejadores reales del backoffice con dependencias simuladas; no abre
la base configurada ni envía correo. Está incluida en `npm test`. Devuelve código
0 cuando todo pasa y 1 si existe un criterio incumplido. Los resultados se guardan en
`backend/docs/qa-logica-2026-10-14/resultados.json`.

Consulta [el informe y las instrucciones de reproducción](backend/docs/qa-logica-2026-10-14/INFORME.md).
Las [correcciones y resultados actuales](backend/docs/qa-logica-2026-10-14/CORRECCIONES.md)
documentan la resolución de los doce hallazgos iniciales.
