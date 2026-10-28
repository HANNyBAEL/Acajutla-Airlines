const mysql = require('mysql2/promise');
require('dotenv').config();

const columnExists = async (db, table, column) => {
  const [rows] = await db.query(
    'SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return rows.length > 0;
};

const tableExists = async (db, table) => {
  const [rows] = await db.query(
    'SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  return rows.length > 0;
};

const referencias = [
  { country: 'CR', code: 'IVA_GENERAL', name: 'IVA general (referencial)', type: 'percentage', value: 13, currency: 'CRC', applies: 'all', status: 'verified', automatic: false, source: 'https://www.hacienda.go.cr/docs/TarifasdelIVA.pdf', note: 'La tarifa general no es la tarifa de boletos aéreos. Hacienda publica 4% para boletos nacionales y 10% para internacionales; esas tasas se configuran como reglas automáticas aparte.' },
  { country: 'CR', code: 'CR-IVA-NAC', name: 'IVA sobre boleto aéreo nacional', type: 'percentage', value: 4, currency: 'CRC', applies: 'domestic', status: 'verified', automatic: true, source: 'https://www.hacienda.go.cr/docs/TarifasdelIVA.pdf', note: 'Tarifa especial para pasajes aéreos nacionales. Aplicada al valor del boleto.' },
  { country: 'CR', code: 'CR-IVA-INT', name: 'IVA sobre boleto aéreo internacional', type: 'percentage', value: 10, currency: 'CRC', applies: 'international', status: 'verified', automatic: true, source: 'https://www.hacienda.go.cr/docs/TarifasdelIVA.pdf', note: 'Tarifa especial para pasajes internacionales: 10% del valor del boleto.' },
  { country: 'CR', code: 'CR-ICT-ORIGEN', name: 'Impuesto ICT por origen de ruta', type: 'percentage', value: 5, currency: 'CRC', applies: 'international', status: 'verified', automatic: true, source: 'https://ict.go.cr/es/informacion-institucional/administracion-tributaria.html', note: 'El ICT informa 5% sobre pasajes cuyo origen de ruta es Costa Rica. No es el impuesto de USD 15, que se cobra al ingresar a Costa Rica con boleto comprado en el exterior.' },
  { country: 'CR', code: 'CR-ICT-VENTA', name: 'Impuesto ICT por boleto vendido en Costa Rica', type: 'percentage', value: 5, currency: 'CRC', applies: 'international', status: 'verified', automatic: false, source: 'https://ict.go.cr/es/informacion-institucional/administracion-tributaria.html', note: 'El ICT informa otro impuesto de 5% para pasajes vendidos en Costa Rica. No se automatiza porque el sistema no registra el lugar de venta del boleto.' },
  { country: 'CR', code: 'CR-ICT-INGRESO-15', name: 'Impuesto por ingreso aéreo con boleto comprado fuera del país', type: 'fixed', value: 15, currency: 'USD', applies: 'all', status: 'verified', automatic: false, source: 'https://ict.go.cr/es/informacion-institucional/administracion-tributaria.html', note: 'Se cobra al ingresar a Costa Rica con boleto comprado en el exterior; es un cargo de llegada y no debe sumarse a un tramo que sale de Costa Rica.' },
  { country: 'SV', code: 'IVA_GENERAL', ruleCode: '20', name: 'IVA general', type: 'percentage', value: 13, currency: 'USD', applies: 'all', status: 'verified', automatic: true, source: 'https://www.mh.gob.sv/wp-content/uploads/2020/11/PMHDC9306.pdf', note: 'La tasa general de IVA es 13%. La regla de cobro ya está en tax_rules con código 20; esta fila documenta la referencia legal.' },
  { country: 'SV', airport: 'SAL', code: 'AIES-EMB', name: 'Derecho de embarque CEPA', type: 'fixed', value: 22.13, currency: 'USD', applies: 'all', status: 'verified', automatic: false, source: 'https://www.cepa.gob.sv/servicios/pliego-tarifario-del-aeropuerto-internacional-de-el-salvador-san-oscar-arnulfo-romero-y-galdamez/', note: 'CEPA publica USD 22.13 por pasajero saliendo y señala que sus tarifas incluyen IVA. No se activa para cobro porque ya existe un cargo de salida de USD 7 en la configuración y hay que descartar duplicidad.' },
  { country: 'SV', airport: 'SAL', code: 'SV-LEGACY-71', ruleCode: '71', name: 'Cargo por salida internacional existente', type: 'fixed', value: 7, currency: 'USD', applies: 'international', status: 'review', automatic: true, source: null, note: 'La pantalla actual muestra este cargo activo, pero no encontramos una fuente oficial vigente para los USD 7. Comparar con el pliego CEPA antes de reemplazarlo o combinarlo con el derecho de embarque.' },
  { country: 'SV', airport: 'LUA', code: 'LUA-SIN-TARIFA', name: 'Tarifa de pasajero no localizada', type: 'fixed', value: null, currency: 'USD', applies: 'all', status: 'review', automatic: false, source: 'https://www.cepa.gob.sv/servicios-aeropuerto-internacional-de-el-salvador/', note: 'No encontré un pliego público de tarifa de pasajeros específico para LUA. Mantener sin cobro hasta que CEPA confirme operación y tarifa.' },
  { country: 'GT', code: 'IVA_GENERAL', name: 'IVA general', type: 'percentage', value: 12, currency: 'GTQ', applies: 'all', status: 'verified', automatic: false, source: 'https://en.portal.sat.gob.gt/portal/preguntas-frecuentes/principales-impuestos-guatemala/', note: 'Tasa general de productos y servicios. No se aplica automáticamente a boletos aéreos; verificar tratamiento fiscal de la ruta y del boleto.' },
  { country: 'GT', airport: 'GUA', code: 'GT-SALIDA', name: 'Impuesto de salida aérea', type: 'fixed', value: 30, currency: 'USD', applies: 'international', status: 'verified', automatic: true, source: 'https://www.gov.uk/foreign-travel-advice/guatemala/entry-requirements', note: 'El aviso de viaje del Reino Unido confirma USD 30, normalmente incluidos en el boleto. Verificar exenciones y conciliación con los impuestos del transportista.' },
  { country: 'HN', code: 'ISV_GENERAL', name: 'ISV general', type: 'percentage', value: 15, currency: 'HNL', applies: 'all', status: 'verified', automatic: false, source: 'https://www.sar.gob.hn/impuesto-sobre-ventas-isv/', note: 'Referencia de tasa general. La SAR documenta una tasa especial de 18% para boletos aéreos de clase privilegiada; no aplicar una tasa general al boleto sin clasificar la tarifa.' },
  { country: 'HN', code: 'ISV-AEREO-PRIV', name: 'ISV sobre boleto aéreo de clase privilegiada', type: 'percentage', value: 18, currency: 'HNL', applies: 'all', status: 'verified', automatic: false, source: 'https://www.sar.gob.hn/wp-content/uploads/2024/01/Revista-Tributaria-2024.pdf', note: 'Tasa especial expresamente indicada por la SAR para boletos aéreos de clase privilegiada. El sistema todavía no distingue ese tratamiento por clase tarifaria.' },
  { country: 'HN', airport: 'XPL', code: 'HN-PAS-INT', name: 'Servicio al pasajero internacional', type: 'fixed', value: 42.20, currency: 'USD', applies: 'international', status: 'verified', automatic: true, source: 'https://aeropuerto.hn/documents/Tarifario_2026.pdf', note: 'Tarifa vigente desde el 9 de abril de 2026 para salida internacional desde Palmerola.' },
  { country: 'HN', airport: 'TGU', code: 'HN-PAS-NAC', name: 'Servicio al pasajero nacional', type: 'fixed', value: 44.33, currency: 'HNL', applies: 'domestic', status: 'verified', automatic: false, source: 'https://aeropuerto.hn/documents/Tarifario_2026.pdf', note: 'Tarifa nacional de Toncontín para 2026. Está en lempiras; falta una conversión a USD con tasa oficial para usarla en el motor de cobro.' },
  { country: 'MX', code: 'IVA_GENERAL', name: 'IVA general', type: 'percentage', value: 16, currency: 'MXN', applies: 'all', status: 'verified', automatic: false, source: 'https://wwwmatnp.sat.gob.mx/articulo/19848/articulo-1', note: 'Tasa general. La TUA y el transporte aéreo tienen condiciones propias; no sumar 16% automáticamente a toda la tarifa del boleto.' },
  { country: 'MX', airport: 'MEX', code: 'TUA-NAC-2026-10', name: 'TUA nacional AICM · octubre 2026', type: 'fixed', value: 526.570, currency: 'MXN', applies: 'domestic', status: 'verified', automatic: false, source: 'https://www.aicm.com.mx/aicm/negocios/tarifas', from: '2026-10-01', to: '2026-11-01', note: 'Tarifa mensual antes de IVA. No se automatiza: el motor trabaja en USD y la TUA cambia mensualmente.' },
  { country: 'MX', airport: 'MEX', code: 'TUA-INT-2026-10', name: 'TUA internacional AICM · octubre 2026', type: 'fixed', value: 999.950, currency: 'MXN', applies: 'international', status: 'verified', automatic: false, source: 'https://www.aicm.com.mx/aicm/negocios/tarifas', from: '2026-10-01', to: '2026-11-01', note: 'Tarifa mensual antes de IVA. No se automatiza: el motor trabaja en USD y la TUA cambia mensualmente.' },
  { country: 'NI', code: 'IVA_GENERAL', name: 'IVA general', type: 'percentage', value: 15, currency: 'NIO', applies: 'all', status: 'verified', automatic: false, source: 'https://www.dgi.gob.ni/FAQ/creacion__materia_imponible__h.htm', note: 'Tasa general del IVA. No se aplica automáticamente al boleto por posibles reglas de exportación y tratamiento de servicios internacionales.' },
  { country: 'NI', airport: 'MGA', code: 'MGA-DER-TERM', name: 'Derecho de terminal internacional', type: 'fixed', value: 44.23, currency: 'USD', applies: 'international', status: 'review', automatic: false, source: 'https://www.eaai.com.ni/der-term-pasj-sal/', note: 'EAAI publica USD 44.23. Hay discrepancia con otra página de EAAI que indica USD 38 total y con el AIP que indica USD 35 de terminal; confirmar el total vigente antes de cobrarlo.' },
  { country: 'NI', airport: 'MGA', code: 'MGA-AIP-TERM', name: 'Derecho de terminal según AIP', type: 'fixed', value: 35, currency: 'USD', applies: 'international', status: 'review', automatic: false, source: 'https://www.cocesna.org/aipca/AIP_2659/Eurocontrol/COCESNA/2026-10-01-NON%20AIRAC/html/eAIP/ES-MN-GEN-4.1-es-ES.html', note: 'AIP actualizado en 2026 indica USD 35 y exenciones. Contradice el valor USD 44.23 publicado por EAAI; resolver cuál componente/total corresponde.' },
  { country: 'PA', code: 'ITBMS-AEREO', name: 'ITBMS en transporte aéreo de pasajeros', type: 'percentage', value: 7, currency: 'PAB', applies: 'all', status: 'verified', automatic: true, source: 'https://etax2.mef.gob.pa/etax2web/microayudas/Ayuda_otros/F430v4hlp.htm', note: 'La DGI incluye transporte aéreo local e internacional entre las operaciones gravadas al 7%.' },
  { country: 'PA', airport: 'PTY', code: 'PTY-SERV-PAX', name: 'Tasa de servicio al pasajero internacional', type: 'fixed', value: 40, currency: 'PAB', applies: 'international', status: 'verified', automatic: true, source: 'https://www.aeronautica.gob.pa/ais-aip/AIP%20PDF%20COMPLETO/1.%20AIP%20-%20Publicacion%20de%20Informacion%20Aeronautica/1.%20GEN/GEN%204%20DERECHOS%20POR%20EL%20USO%20DE%20AD.pdf', note: 'AIP AAC publica B/.40 por pasajero que sale al exterior desde Tocumen; contiene exenciones y descuentos para ciertos pasajeros.' },
  { country: 'US', code: 'US-TAX-7.5', name: 'Impuesto federal sobre transporte aéreo', type: 'percentage', value: 7.5, currency: 'USD', applies: 'all', status: 'verified', automatic: false, source: 'https://www.irs.gov/publications/p510', note: 'El IRS grava 7.5% del transporte aéreo gravable. Para rutas internacionales se requiere prorratear la parte de transporte dentro de EE.UU.; no automatizar con una tasa simple por tramo.' },
  { country: 'US', code: 'US-DOM-SEG-2026', name: 'Impuesto federal por segmento doméstico 2026', type: 'fixed', value: 5.30, currency: 'USD', applies: 'domestic', status: 'verified', automatic: false, source: 'https://www.irs.gov/instructions/i720', note: 'Tasa 2026 por segmento doméstico; existen excepciones de aeropuertos rurales y reglas de itinerario.' },
  { country: 'US', code: 'US-INT-2026', name: 'Impuesto federal de instalaciones de viaje internacional 2026', type: 'fixed', value: 23.40, currency: 'USD', applies: 'international', status: 'verified', automatic: false, source: 'https://www.irs.gov/instructions/i720', note: 'Tasa 2026 por persona para vuelos que comienzan o terminan en EE.UU.; el cobro depende de la estructura del viaje.' },
  { country: 'US', airport: 'SFO', code: 'SFO-PFC', name: 'Passenger Facility Charge San Francisco', type: 'fixed', value: 4.50, currency: 'USD', applies: 'all', status: 'verified', automatic: true, source: 'https://www.faa.gov/sites/faa.gov/files/2023-01/PFC-Decisions-Online-2018.pdf', note: 'La FAA aprobó el nivel de USD 4.50 para SFO hasta marzo de 2029. Aplican exenciones y reglas federales de itinerario.' },
  { country: 'US', airport: 'MIA', code: 'MIA-PFC', name: 'Passenger Facility Charge', type: 'fixed', value: 4.50, currency: 'USD', applies: 'all', status: 'verified', automatic: true, source: 'https://www.faa.gov/airports/pfc', note: 'MIA cobra USD 4.50 por pasajero embarcado elegible. Existen exenciones y topes por itinerario; el sistema aún no aplica esos límites.' }
];

const reglasAutomaticas = [
  { country: 'SV', code: '20', name: 'IVA El Salvador', type: 'percentage', value: 13, applies: 'all', source: 'https://www.mh.gob.sv/wp-content/uploads/2020/11/PMHDC9306.pdf', notes: 'Tasa general de IVA de El Salvador.' },
  { country: 'CR', code: 'CR-IVA-NAC', name: 'IVA boleto aéreo nacional', type: 'percentage', value: 4, applies: 'domestic', source: 'https://www.hacienda.go.cr/docs/TarifasdelIVA.pdf', notes: 'Tarifa especial sobre boletos aéreos nacionales.' },
  { country: 'CR', code: 'CR-IVA-INT', name: 'IVA boleto aéreo internacional', type: 'percentage', value: 10, applies: 'international', source: 'https://www.hacienda.go.cr/docs/TarifasdelIVA.pdf', notes: 'Tarifa especial sobre boletos aéreos internacionales.' },
  { country: 'CR', code: 'CR-ICT-ORIGEN', name: 'Impuesto ICT por origen de ruta', type: 'percentage', value: 5, applies: 'international', source: 'https://ict.go.cr/es/informacion-institucional/administracion-tributaria.html', notes: '5% sobre pasajes internacionales cuyo origen de ruta sea Costa Rica.' },
  { country: 'PA', code: 'ITBMS-AEREO', name: 'ITBMS transporte aéreo', type: 'percentage', value: 7, applies: 'all', source: 'https://etax2.mef.gob.pa/etax2web/microayudas/Ayuda_otros/F430v4hlp.htm', notes: 'La DGI aplica ITBMS 7% al transporte aéreo de pasajeros local e internacional.' },
  { country: 'GT', airport: 'GUA', code: 'GT-SALIDA', name: 'Impuesto de salida aérea', type: 'fixed', value: 30, applies: 'international', source: 'https://www.gov.uk/foreign-travel-advice/guatemala/entry-requirements', notes: 'USD 30, normalmente incluidos en el boleto; validar exenciones y conciliación de ticket.' },
  { country: 'HN', airport: 'XPL', code: 'HN-PAS-INT', name: 'Servicio al pasajero internacional Palmerola', type: 'fixed', value: 42.20, applies: 'international', source: 'https://aeropuerto.hn/documents/Tarifario_2026.pdf', notes: 'Tarifa vigente desde abril de 2026 para salida internacional.' },
  { country: 'PA', airport: 'PTY', code: 'PTY-SERV-PAX', name: 'Servicio al pasajero internacional Tocumen', type: 'fixed', value: 40, applies: 'international', source: 'https://www.aeronautica.gob.pa/ais-aip/AIP%20PDF%20COMPLETO/1.%20AIP%20-%20Publicacion%20de%20Informacion%20Aeronautica/1.%20GEN/GEN%204%20DERECHOS%20POR%20EL%20USO%20DE%20AD.pdf', notes: 'B/.40 por pasajero que sale al exterior desde Tocumen, sujeto a exenciones.' },
  { country: 'US', airport: 'SFO', code: 'SFO-PFC', name: 'Passenger Facility Charge San Francisco', type: 'fixed', value: 4.50, applies: 'all', source: 'https://www.faa.gov/sites/faa.gov/files/2023-01/PFC-Decisions-Online-2018.pdf', notes: 'La FAA aprobó el nivel de USD 4.50 hasta marzo de 2029; considerar exenciones.' },
  { country: 'US', airport: 'MIA', code: 'MIA-PFC', name: 'Passenger Facility Charge Miami', type: 'fixed', value: 4.50, applies: 'all', source: 'https://www.faa.gov/airports/pfc', notes: 'USD 4.50 por pasajero elegible; considerar exenciones y topes FAA al emitir boleto.' }
];

(async () => {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, ssl: { rejectUnauthorized: false } });
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS countries (
      id INT AUTO_INCREMENT PRIMARY KEY, code CHAR(2) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query(`INSERT INTO airports (iata_code, icao_code, name, city, country, country_code, active)
      SELECT 'XPL', 'MHPR', 'Aeropuerto Internacional de Palmerola', 'Comayagua', 'Honduras', 'HN', 1
      WHERE NOT EXISTS (SELECT 1 FROM airports WHERE iata_code = 'XPL')`);

    // EU no es un código ISO de país; algunos registros antiguos lo usaban para Estados Unidos.
    await db.query(`UPDATE airports SET country_code = 'US', country = 'Estados Unidos'
      WHERE UPPER(country_code) = 'EU' AND LOWER(country) LIKE '%unidos%'`);
    await db.query(`UPDATE airports SET name = 'Aeropuerto Nacional Toncontín', city = 'Tegucigalpa'
      WHERE iata_code = 'TGU' AND UPPER(country_code) = 'HN'`);
    await db.query(`INSERT INTO countries (code, name)
      SELECT DISTINCT UPPER(COALESCE(NULLIF(country_code, ''), 'SV')), MAX(country)
      FROM airports WHERE country IS NOT NULL AND country <> ''
      GROUP BY UPPER(COALESCE(NULLIF(country_code, ''), 'SV'))
      ON DUPLICATE KEY UPDATE name = VALUES(name)`);

    if (!(await columnExists(db, 'airports', 'country_id'))) {
      await db.query('ALTER TABLE airports ADD COLUMN country_id INT NULL');
      await db.query('CREATE INDEX airports_country_id ON airports (country_id)');
    }
    await db.query(`UPDATE airports a JOIN countries c
      ON CAST(c.code AS BINARY) = CAST(UPPER(COALESCE(NULLIF(a.country_code, ''), 'SV')) AS BINARY)
      SET a.country_id = c.id WHERE a.country_id IS NULL OR a.country_id <> c.id`);

    await db.query(`CREATE TABLE IF NOT EXISTS tax_rules (
      id INT AUTO_INCREMENT PRIMARY KEY, country_id INT NOT NULL, airport_id INT NULL,
      code VARCHAR(30) NOT NULL, name VARCHAR(120) NOT NULL,
      scope ENUM('flight','ancillary') NOT NULL DEFAULT 'flight',
      calculation_type ENUM('percentage','fixed') NOT NULL,
      value DECIMAL(12,4) NOT NULL, applies_to ENUM('all','domestic','international') NOT NULL DEFAULT 'all',
      active TINYINT(1) NOT NULL DEFAULT 1, valid_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      valid_to DATETIME NULL, created_by INT NULL, updated_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY tax_country_airport (country_id, airport_id, active), KEY tax_validity (valid_from, valid_to)
    )`);
    for (const [column, definition] of [
      ['scope', "ENUM('flight','ancillary') NOT NULL DEFAULT 'flight'"],
      ['source_url', 'VARCHAR(1000) NULL'],
      ['source_checked_at', 'DATE NULL'],
      ['notes', 'TEXT NULL']
    ]) {
      if (!(await columnExists(db, 'tax_rules', column))) await db.query(`ALTER TABLE tax_rules ADD COLUMN ${column} ${definition}`);
    }

    await db.query(`CREATE TABLE IF NOT EXISTS reservation_tax_lines (
      id INT AUTO_INCREMENT PRIMARY KEY, reservation_id INT NOT NULL, passenger_id INT NOT NULL, flight_id INT NOT NULL,
      tax_rule_id INT NULL, country_id INT NULL, airport_id INT NULL, code VARCHAR(30) NOT NULL, name VARCHAR(120) NOT NULL,
      calculation_type ENUM('percentage','fixed') NOT NULL, rate DECIMAL(12,4) NOT NULL,
      taxable_amount DECIMAL(12,2) NOT NULL DEFAULT 0, amount DECIMAL(12,2) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY rtl_reservation (reservation_id), KEY rtl_segment (passenger_id, flight_id)
    )`);

    await db.query(`CREATE TABLE IF NOT EXISTS tax_references (
      id INT AUTO_INCREMENT PRIMARY KEY, country_id INT NOT NULL, airport_id INT NULL,
      code VARCHAR(40) NOT NULL, rule_code VARCHAR(30) NULL, name VARCHAR(180) NOT NULL,
      calculation_type ENUM('percentage','fixed') NOT NULL, value DECIMAL(12,4) NULL,
      currency CHAR(3) NOT NULL DEFAULT 'USD', applies_to ENUM('all','domestic','international') NOT NULL DEFAULT 'all',
      status ENUM('verified','review') NOT NULL DEFAULT 'review', automatic TINYINT(1) NOT NULL DEFAULT 0,
      valid_from DATE NULL, valid_to DATE NULL, source_url VARCHAR(1000) NULL, source_checked_at DATE NULL,
      notes TEXT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY reference_country_airport (country_id, airport_id), KEY reference_validity (valid_from, valid_to)
    )`);

    // El boleto aéreo en Costa Rica tiene tarifas de IVA especiales; desactiva el 13% genérico antiguo.
    await db.query(`UPDATE tax_rules tr JOIN countries c ON c.id = tr.country_id
      SET tr.active = 0, tr.updated_at = NOW()
      WHERE c.code = 'CR' AND UPPER(tr.code) IN ('IVA','CR-IVA-13') AND tr.calculation_type = 'percentage' AND tr.value = 13`);

    const insertarReglaSiNoExiste = async (rule) => {
      const [[country]] = await db.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [rule.country]);
      if (!country) return;
      let airportId = null;
      if (rule.airport) {
        const [[airport]] = await db.query('SELECT id FROM airports WHERE iata_code = ? AND country_id = ? LIMIT 1', [rule.airport, country.id]);
        if (!airport) return;
        airportId = airport.id;
      }
      const [existing] = await db.query(
        'SELECT id FROM tax_rules WHERE country_id = ? AND airport_id <=> ? AND code = ? LIMIT 1',
        [country.id, airportId, rule.code]
      );
      if (existing.length) return;
      await db.query(`INSERT INTO tax_rules
        (country_id, airport_id, code, name, calculation_type, value, applies_to, active, source_url, source_checked_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_DATE, ?)`,
      [country.id, airportId, rule.code, rule.name, rule.type, rule.value, rule.applies, rule.source, rule.notes]);
    };
    for (const rule of reglasAutomaticas) await insertarReglaSiNoExiste(rule);

    // Inicializa reglas propias para ancillary copiando solo tasas de IVA activas;
    // cargos aeroportuarios y tributos del boleto nunca se heredan.
    await db.query(`INSERT INTO tax_rules
      (country_id, airport_id, code, name, scope, calculation_type, value, applies_to, active, valid_from, valid_to, source_url, source_checked_at, notes)
      SELECT flight_rule.country_id, flight_rule.airport_id, flight_rule.code, flight_rule.name, 'ancillary',
        flight_rule.calculation_type, flight_rule.value, flight_rule.applies_to, 1, flight_rule.valid_from,
        flight_rule.valid_to, flight_rule.source_url, flight_rule.source_checked_at,
        CONCAT(COALESCE(flight_rule.notes, ''), ' Regla inicial independiente para servicios adicionales.')
      FROM tax_rules flight_rule
      WHERE flight_rule.scope = 'flight' AND flight_rule.active = 1
        AND UPPER(flight_rule.code) IN ('20', 'IVA', 'IVA_GENERAL')
        AND NOT EXISTS (
          SELECT 1 FROM tax_rules ancillary_rule
          WHERE ancillary_rule.scope = 'ancillary'
            AND ancillary_rule.country_id = flight_rule.country_id
            AND ancillary_rule.airport_id <=> flight_rule.airport_id
            AND ancillary_rule.code = flight_rule.code
        )`);

    // Tarifas generales para servicios adicionales. Se guardan en su propio
    // alcance y no se copian los gravámenes especiales de boletos/aeropuertos.
    const impuestosAncillary = [
      { country: 'CR', code: 'CR-IVA-GEN', name: 'IVA general de servicios adicionales', value: 13, source: 'https://www.hacienda.go.cr/docs/TarifasdelIVA.pdf', note: 'Tarifa general; distinta de las tarifas reducidas aplicables a boletos aéreos.' },
      { country: 'GT', code: 'GT-IVA-GEN', name: 'IVA general de servicios adicionales', value: 12, source: 'https://en.portal.sat.gob.gt/portal/preguntas-frecuentes/principales-impuestos-guatemala/', note: 'Tarifa general sobre bienes y servicios.' },
      { country: 'HN', code: 'HN-ISV-GEN', name: 'ISV general de servicios adicionales', value: 15, source: 'https://www.sar.gob.hn/impuesto-sobre-ventas-isv/', note: 'Tasa general; verificar excepciones y tasas especiales.' },
      { country: 'MX', code: 'MX-IVA-GEN', name: 'IVA general de servicios adicionales', value: 16, source: 'https://wwwmat.sat.gob.mx/articulo/19848/articulo-1', note: 'Tasa general; verificar estímulos y reglas territoriales.' },
      { country: 'NI', code: 'NI-IVA-GEN', name: 'IVA general de servicios adicionales', value: 15, source: 'https://www.dgi.gob.ni/FAQ/creacion__materia_imponible__h.htm', note: 'Tasa general; verificar territorialidad y excepciones.' },
      { country: 'PA', code: 'PA-ITBMS-GEN', name: 'ITBMS general de servicios adicionales', value: 7, source: 'https://dgi.mef.gob.pa/itbms/Itbms', note: 'Aplicabilidad condicionada a obligaciones del contribuyente y naturaleza del servicio.' }
    ];
    for (const rule of impuestosAncillary) {
      const [[country]] = await db.query('SELECT id FROM countries WHERE code = ? AND active = 1 LIMIT 1', [rule.country]);
      if (!country) continue;
      const [existing] = await db.query(
        'SELECT id FROM tax_rules WHERE country_id = ? AND airport_id IS NULL AND code = ? AND scope = \'ancillary\' LIMIT 1',
        [country.id, rule.code]
      );
      if (!existing.length) await db.query(`INSERT INTO tax_rules
        (country_id, airport_id, code, name, scope, calculation_type, value, applies_to, active, source_url, source_checked_at, notes)
        VALUES (?, NULL, ?, ?, 'ancillary', 'percentage', ?, 'all', 1, ?, CURRENT_DATE, ?)`,
      [country.id, rule.code, rule.name, rule.value, rule.source, rule.note]);
    }

    const insertarReferenciaSiNoExiste = async (reference) => {
      const [[country]] = await db.query('SELECT id FROM countries WHERE code = ? LIMIT 1', [reference.country]);
      if (!country) return;
      let airportId = null;
      if (reference.airport) {
        const [[airport]] = await db.query('SELECT id FROM airports WHERE iata_code = ? AND country_id = ? LIMIT 1', [reference.airport, country.id]);
        if (!airport) return;
        airportId = airport.id;
      }
      const [existing] = await db.query(
        'SELECT id FROM tax_references WHERE country_id = ? AND airport_id <=> ? AND code = ? LIMIT 1',
        [country.id, airportId, reference.code]
      );
      if (existing.length) return;
      await db.query(`INSERT INTO tax_references
        (country_id, airport_id, code, rule_code, name, calculation_type, value, currency, applies_to, status, automatic, valid_from, valid_to, source_url, source_checked_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, ?)`,
      [country.id, airportId, reference.code, reference.ruleCode || reference.code, reference.name, reference.type, reference.value, reference.currency,
        reference.applies, reference.status, reference.automatic ? 1 : 0, reference.from || null, reference.to || null,
        reference.source || null, reference.note || null]);
    };
    for (const reference of referencias) await insertarReferenciaSiNoExiste(reference);

    // Normaliza aeropuertos estadounidenses heredados con código EU, sin tocar líneas fiscales históricas.
    const [euCountries] = await db.query(`SELECT id FROM countries WHERE code = 'EU' AND LOWER(name) LIKE '%unidos%'`);
    const [[usCountry]] = await db.query(`SELECT id FROM countries WHERE code = 'US' LIMIT 1`);
    if (euCountries.length && usCountry) {
      for (const legacy of euCountries) {
        await db.query('UPDATE airports SET country_id = ?, country_code = \'US\', country = \'Estados Unidos\' WHERE country_id = ?', [usCountry.id, legacy.id]);
        if (await tableExists(db, 'tax_rules')) await db.query('UPDATE tax_rules SET country_id = ? WHERE country_id = ?', [usCountry.id, legacy.id]);
        if (await tableExists(db, 'tax_references')) await db.query('UPDATE tax_references SET country_id = ? WHERE country_id = ?', [usCountry.id, legacy.id]);
        await db.query('UPDATE countries SET active = 0 WHERE id = ?', [legacy.id]);
      }
    } else if (euCountries.length) {
      await db.query(`UPDATE countries SET code = 'US', name = 'Estados Unidos' WHERE id = ?`, [euCountries[0].id]);
    }

    console.log('Migración de fiscalidad y tasas con referencias verificables OK');
  } finally { await db.end(); }
})().catch((error) => { console.error('Error:', error.message); process.exit(1); });
