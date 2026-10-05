const fs = require('fs');
let code = fs.readFileSync('src/config/db.js', 'utf8');

code = code.replace(
  'keepAliveInitialDelay: 0,',
  "keepAliveInitialDelay: 0,\n  timezone: '-06:00',\n  dateStrings: true,"
);

fs.writeFileSync('src/config/db.js', code);
