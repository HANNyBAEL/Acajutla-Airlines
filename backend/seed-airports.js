const mysql = require('mysql2/promise');
require('dotenv').config();

const aeropuertos = [
  ['SAL', 'MSLP', 'Aeropuerto Internacional Monseñor Óscar Arnulfo Romero', 'San Salvador', 'El Salvador', 'SV'],
  ['MIA', 'KMIA', 'Aeropuerto Internacional de Miami', 'Miami', 'Estados Unidos', 'US'],
  ['GUA', 'MGGT', 'Aeropuerto Internacional La Aurora', 'Guatemala City', 'Guatemala', 'GT'],
  ['SJO', 'MROC', 'Aeropuerto Internacional Juan Santamaría', 'San José', 'Costa Rica', 'CR'],
  ['MEX', 'MMMX', 'Aeropuerto Internacional de la Ciudad de México', 'Ciudad de México', 'México', 'MX'],
  ['PTY', 'MPTO', 'Aeropuerto Internacional de Tocumen', 'Panamá City', 'Panamá', 'PA'],
  ['LIR', 'MRLB', 'Aeropuerto Internacional Daniel Oduber', 'Liberia', 'Costa Rica', 'CR'],
  ['LUA', 'MSLU', 'Aeropuerto Internacional de La Unión', 'La Unión', 'El Salvador', 'SV'],
  ['TGU', 'MHTG', 'Aeropuerto Internacional Toncontín', 'Tegucigalpa', 'Honduras', 'HN'],
  ['MGA', 'MNMG', 'Aeropuerto Internacional Augusto C. Sandino', 'Managua', 'Nicaragua', 'NI']
];

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, ssl: { rejectUnauthorized: false }
  });
  let insertados = 0;
  for (const a of aeropuertos) {
    const [ex] = await pool.query('SELECT id FROM airports WHERE iata_code = ?', [a[0]]);
    if (ex.length === 0) {
      await pool.query('INSERT INTO airports (iata_code, icao_code, name, city, country, country_code, active) VALUES (?, ?, ?, ?, ?, ?, 1)', a);
      insertados++;
    }
  }
  console.log('Aeropuertos insertados: ' + insertados);
  process.exit(0);
})();