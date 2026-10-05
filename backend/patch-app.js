const fs = require('fs');
let code = fs.readFileSync('src/app.js', 'utf8');

const injection = `
const { auditar } = require('./middleware/audit');
const globalAuditor = auditar();
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return globalAuditor(req, res, next);
  }
  next();
});

// Rutas
`;

code = code.replace('// Rutas\n', injection);

fs.writeFileSync('src/app.js', code);
