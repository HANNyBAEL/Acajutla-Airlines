# Despliegue en Render — SkyManager

## Backend (Web Service)
1. Repo GitHub → New → Web Service.
2. Build: `npm install`; Start: `npm start`.
3. Env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, MFA_SECRET, BREVO_API_KEY, DTE_AMBIENTE, RATE_LIMIT_DISABLED, SIGNATURE_REQUIRED, BACKUP_ENABLED.
4. Healthcheck: GET /health.

## Frontend backoffice (Static Site)
1. New → Static Site; Build: `npm install && npm run build`; Publish: `dist`.
2. Env: VITE_API_URL = URL del backend.
3. Redirects: `/* /index.html 200`.

## Base de datos
Aiven MySQL (externo). Backups diarios cifrados (RNF-003). Conexión TLS.

## Post-deploy
- Ejecutar migraciones (migracion-*.js) una vez.
- Verificar /api/qa/checklist en verde.