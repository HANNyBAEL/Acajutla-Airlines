const assert = require('node:assert/strict');
const pool = require('../src/config/db');

// Captura la cola sin enviar correos ni depender de la base de datos.
delete process.env.BREVO_API_KEY;
let correo;
pool.query = async (sql, params) => {
  if (sql.startsWith('SELECT r.*')) return [[{ id: 1, pnr: 'ABC123', status: 'pending', estimated_total: 100, email: 'test@example.com', first_names: 'Cliente', last_names: 'Prueba' }]];
  if (sql.startsWith('SELECT first_names')) return [[{ first_names: 'Ana', last_names: 'Uno', passenger_type: 'adult' }, { first_names: 'Luis', last_names: 'Dos', passenger_type: 'adult' }]];
  if (sql.includes('FROM flight_segments fs JOIN passengers')) return [[
    { first_names: 'Ana', last_names: 'Uno', flight_number: 'AA1', origen: 'SAL', destino: 'GUA', departure_datetime: '2026-10-28T12:00:00Z', seat: '1A' },
    { first_names: 'Luis', last_names: 'Dos', flight_number: 'AA1', origen: 'SAL', destino: 'GUA', departure_datetime: '2026-10-28T12:00:00Z', seat: '1B' },
    { first_names: 'Ana', last_names: 'Uno', flight_number: 'AA2', origen: 'GUA', destino: 'SAL', departure_datetime: '2026-10-29T12:00:00Z', seat: '2A' },
    { first_names: 'Luis', last_names: 'Dos', flight_number: 'AA2', origen: 'GUA', destino: 'SAL', departure_datetime: '2026-10-29T12:00:00Z', seat: null },
  ]];
  if (sql.startsWith('INSERT INTO email_outbox')) { correo = { template: params[0], to_email: params[1], subject: params[2], html: params[3] }; return [{ insertId: 10 }]; }
  if (sql.startsWith('SELECT * FROM email_outbox')) return [[correo]];
  if (sql.startsWith('UPDATE email_outbox')) return [{ affectedRows: 1 }];
  throw new Error('Consulta inesperada: ' + sql);
};

const { enviarConfirmacionReserva } = require('../src/services/mailerService');
(async () => {
  const resultado = await enviarConfirmacionReserva(1);
  assert.equal(resultado.enviado, true);
  assert.equal(resultado.simulado, true);
  assert.equal(correo.to_email, 'test@example.com');
  const filas = correo.html.match(/<tr><td>[^<]*<\/td><td>AA[12]<\/td><td>[^<]*<\/td><td>[^<]*<\/td><td>[^<]*<\/td><\/tr>/g) || [];
  assert.equal(filas.length, 4);
  assert.match(filas[0], /Ana Uno<\/td><td>AA1.*<td>1A<\/td>/);
  assert.match(filas[1], /Luis Dos<\/td><td>AA1.*<td>1B<\/td>/);
  assert.match(filas[2], /Ana Uno<\/td><td>AA2.*<td>2A<\/td>/);
  assert.match(filas[3], /Luis Dos<\/td><td>AA2.*<td>Por asignar<\/td>/);
  console.log('PASS | correo de reserva muestra el asiento de cada pasajero en cada vuelo');
})().catch((error) => { console.error(error); process.exitCode = 1; });
