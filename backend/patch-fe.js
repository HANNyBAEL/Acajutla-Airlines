const fs = require('fs');
let code = fs.readFileSync('src/services/dteService.js', 'utf8');

code = code.replace(
  "tributos: null, subTotal: totalGravada, ivaRete: 0, totalIva: totalIva,\n        montoTotalOperacion: totalGravada",
  "tributos: tieneSalidaInternacional ? [{ codigo: '71', descripcion: 'Turismo: salida del país por vía aérea $7.00', valor: redondeo(pax.length * 7) }] : null, subTotal: totalGravada, ivaRete: 0, totalIva: totalIva,\n        montoTotalOperacion: redondeo(totalGravada + (tieneSalidaInternacional ? pax.length * 7 : 0))"
);

code = code.replace(
  "const ventaGravada = precioPorPax;\n        return {\n          numItem: i + 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: null",
  "const ventaGravada = tieneSalidaInternacional ? redondeo8(precioPorPax - 7) : precioPorPax;\n        return {\n          numItem: i + 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: tieneSalidaInternacional ? '71' : null"
);

fs.writeFileSync('src/services/dteService.js', code);
