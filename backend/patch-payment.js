const fs = require('fs');
let code = fs.readFileSync('src/services/dteService.js', 'utf8');

code = code.replace(
  "pagos: [{ codigo: CAT017[pago ? pago.method : 'cash'] || '01', montoPago: redondeo(totalGravada + (tieneSalidaInternacional ? pax.length * 7 : 0)), referencia: pago ? pago.external_reference : null, plazo: null, periodo: null }],",
  "pagos: [{ codigo: CAT017[pago ? pago.method : 'cash'] || '01', montoPago: redondeo(totalGravada + (tieneSalidaInternacional ? pax.length * 7 : 0)), referencia: (CAT017[pago ? pago.method : 'cash'] || '01') === '01' ? null : (pago ? pago.external_reference : null), plazo: null, periodo: null }],"
);

code = code.replace(
  "pagos: [{ codigo: CAT017[pago ? pago.method : 'cash'] || '01', montoPago: total, referencia: pago ? pago.external_reference : null, plazo: null, periodo: null }],",
  "pagos: [{ codigo: CAT017[pago ? pago.method : 'cash'] || '01', montoPago: total, referencia: (CAT017[pago ? pago.method : 'cash'] || '01') === '01' ? null : (pago ? pago.external_reference : null), plazo: null, periodo: null }],"
);

fs.writeFileSync('src/services/dteService.js', code);
