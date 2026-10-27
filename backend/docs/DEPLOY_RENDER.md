# DESPLIEGUE EN RENDER — Acajutla Airlines

## Pre-requisitos
- Repo GitHub con backend/ y frontend-backoffice/.
- MySQL Aiven activo (host, puerto, user, password, database).

## Backend (Web Service)
1. Render → New → Web Service → elegir repo → Root Directory: `backend`.
2. Build Command: `npm install` · Start Command: `npm start`.
3. Health Check Path: `/health`.
4. Environment: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, REFRESH_SECRET, JWT_EXPIRES_IN=8h, BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME, DTE_AMBIENTE=00, DTE_NIT, DTE_NRC, CORS_ORIGIN=https://<front>.onrender.com.
5. Deploy. Verificar `https://<api>.onrender.com/health`.

## Frontend backoffice (Static Site)
1. Render → New → Static Site → mismo repo → Root Directory: `frontend-backoffice`.
2. Build Command: `npm install && npm run build` · Publish Directory: `dist`.
3. Environment: `VITE_API_URL=https://<api>.onrender.com/api`.
4. Redirects/Rewrites: `/*` → `/index.html` (200) para SPA.
5. Deploy y probar login.

## Post-despliegue
1. Ejecutar migraciones una vez: migracion-bloque-b/c/e, migracion-checkin, migracion-comercial, migracion-correos, `npm run migrate:payments` y `npm run migrate:returns`.
2. Seed de aeropuertos y usuario admin.
3. Antes del despliegue fiscal, confirmar que `payments.requiere_deduccion_fiscal`, `payments.receptor_dte` y `dte_return_events.returned_amount` existen. La migración de retornos marca como consumidos los eventos históricos sin monto para evitar reembolsos duplicados hasta conciliarlos.
4. Ejecutar `npm test` para las regresiones locales aisladas. `node pruebas/smoke-test.js` puede activar MFA por correo.
5. Verificar /qa/checklist en verde.

## Blueprint opcional
Usar render.yaml de la raíz del repo (backend web + frontend static).
