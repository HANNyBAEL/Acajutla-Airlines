# SkyManager

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
