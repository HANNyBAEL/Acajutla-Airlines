const fs = require('fs');
let code = fs.readFileSync('frontend-backoffice/src/pages/CumplimientoFiscal.jsx', 'utf8');

code = code.replace(
  "const sellados = dtes.filter((d) => d.reception_seal && ['01','11','14'].includes(String(d.dte_type)));",
  "const sellados = dtes.filter((d) => d.reception_seal && d.transmission_status === 'accepted' && ['01','11','14'].includes(String(d.dte_type)));"
);

fs.writeFileSync('frontend-backoffice/src/pages/CumplimientoFiscal.jsx', code);
