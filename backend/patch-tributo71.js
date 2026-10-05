const fs = require('fs');
let code = fs.readFileSync('src/services/dteService.js', 'utf8');

code = code.replace(
  'SELECT DISTINCT f.flight_number, f.departure_datetime FROM flight_segments fs\n      JOIN flights f ON f.id = fs.flight_id WHERE fs.reservation_id = ? ORDER BY f.departure_datetime',
  'SELECT DISTINCT f.flight_number, f.departure_datetime, a_orig.country_code AS origin_country, a_dest.country_code AS dest_country FROM flight_segments fs JOIN flights f ON f.id = fs.flight_id JOIN routes r ON r.id = f.route_id JOIN airports a_orig ON a_orig.id = r.origin_id JOIN airports a_dest ON a_dest.id = r.destination_id WHERE fs.reservation_id = ? ORDER BY f.departure_datetime'
);

code = code.replace(
  "const vuelosTxt = vuelos.map((v) => v.flight_number).join(', ');",
  "const vuelosTxt = vuelos.map((v) => v.flight_number).join(', ');\n  const tieneSalidaInternacional = vuelos.some(v => v.origin_country === 'SV' && v.dest_country !== 'SV');"
);

code = code.replace(
  "const ventaGravada = precioPorPax;\n        return {\n          numItem: i + 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: null",
  "const ventaGravada = tieneSalidaInternacional ? redondeo8(precioPorPax - 7) : precioPorPax;\n        return {\n          numItem: i + 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: tieneSalidaInternacional ? '71' : null"
);

code = code.replace(
  "tributos: null, ivaItem: redondeo8((ventaGravada / 1.13) * 0.13), psv: 0, noGravado: 0",
  "tributos: tieneSalidaInternacional ? ['71'] : null, ivaItem: redondeo8((ventaGravada / 1.13) * 0.13), psv: 0, noGravado: 0"
);

code = code.replace(
  "tributos: null, subTotal: totalGravada, ivaRete: 0, totalIva: totalIva,\n        montoTotalOperacion: totalGravada",
  "tributos: tieneSalidaInternacional ? [{ codigo: '71', descripcion: 'Turismo: salida del país por vía aérea $7.00', valor: redondeo(pax.length * 7) }] : null, subTotal: totalGravada, ivaRete: 0, totalIva: totalIva,\n        montoTotalOperacion: redondeo(totalGravada + (tieneSalidaInternacional ? pax.length * 7 : 0))"
);

code = code.replace(
  "pagos: [{ codigo: CAT017[pago ? pago.method : 'cash'] || '01', montoPago: totalGravada,",
  "pagos: [{ codigo: CAT017[pago ? pago.method : 'cash'] || '01', montoPago: redondeo(totalGravada + (tieneSalidaInternacional ? pax.length * 7 : 0)),"
);

code = code.replace(
  "totalPagar: totalGravada, totalLetras: null",
  "totalPagar: redondeo(totalGravada + (tieneSalidaInternacional ? pax.length * 7 : 0)), totalLetras: null"
);

code = code.replace(
  "const base = redondeo8(precioPorPax / 1.13);\n        return {\n          numItem: i + 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: '20'",
  "const base = redondeo8((precioPorPax - (tieneSalidaInternacional ? 7 : 0)) / 1.13);\n        return {\n          numItem: i + 1, tipoItem: 2, codigo: 'PAX-' + p.id, codTributo: tieneSalidaInternacional ? '20,71' : '20'"
);

code = code.replace(
  "tributos: ['20'], psv: 0, noGravado: 0",
  "tributos: tieneSalidaInternacional ? ['20', '71'] : ['20'], psv: 0, noGravado: 0"
);

code = code.replace(
  "tributos: [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: iva }],\n        subTotal: totalGravada",
  "tributos: tieneSalidaInternacional ? [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: iva }, { codigo: '71', descripcion: 'Turismo: salida del país por vía aérea $7.00', valor: redondeo(pax.length * 7) }] : [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: iva }],\n        subTotal: totalGravada"
);

code = code.replace(
  "const total = redondeo(totalGravada + iva);",
  "const total = redondeo(totalGravada + iva + (tieneSalidaInternacional ? pax.length * 7 : 0));"
);

fs.writeFileSync('src/services/dteService.js', code);
console.log('Parcheado con exito');
