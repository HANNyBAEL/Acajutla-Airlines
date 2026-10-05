const fs = require('fs');
let code = fs.readFileSync('src/app.js', 'utf8');

if (!code.includes('process.env.TZ')) {
  code = "process.env.TZ = 'America/El_Salvador';\n" + code;
  fs.writeFileSync('src/app.js', code);
}
