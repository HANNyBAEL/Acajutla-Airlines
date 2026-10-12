// QA: metadata and synthetic SELECTs only. Never starts the application/jobs.
const path = require('node:path');
const fs = require('node:fs');
require('../../node_modules/dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('../../node_modules/mysql2/promise');
const result = { configuration: {}, checks: [] };
for (const key of ['NODE_ENV', 'DTE_AMBIENTE', 'RATE_LIMIT_DISABLED', 'JWT_EXPIRES_IN']) {
  result.configuration[key] = process.env[key] || '(unset)';
}
result.configuration.webCheckoutSecretConfigured = (process.env.WEB_CHECKOUT_SHARED_SECRET || '').length >= 32;
result.configuration.mailProviderConfigured = Boolean(process.env.BREVO_API_KEY);
(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT,
      user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }, timezone: '-06:00', dateStrings: true, connectTimeout: 12000 });
    await conn.query('SET SESSION TRANSACTION READ ONLY');
    await conn.query('START TRANSACTION READ ONLY');
    const checks = [
      ['clock', "SELECT @@session.time_zone AS session_timezone, NOW() AS database_now, UTC_TIMESTAMP() AS utc_now, CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', 'America/El_Salvador') AS salvador_now"],
      ['schema', "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = 'crew_members' AND COLUMN_NAME = 'role_operativo') OR (TABLE_NAME = 'mfa_codes') OR (TABLE_NAME = 'reservations' AND COLUMN_NAME IN ('channel','sales_channel','status')) OR (TABLE_NAME = 'flight_segments' AND COLUMN_NAME IN ('status','checkin_status','seat','fare_id'))) ORDER BY TABLE_NAME, ORDINAL_POSITION"],
      ['mfa_indexes', "SHOW INDEX FROM mfa_codes"],
      ['audit_triggers', "SELECT TRIGGER_NAME, EVENT_MANIPULATION, ACTION_TIMING FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'audit_logs'"],
      ['ambiguous_seat_query', "SELECT id FROM flight_segments fs JOIN reservations rx ON rx.id = fs.reservation_id WHERE fs.flight_id = -1 AND fs.seat = '1A' AND rx.status IN ('pending','confirmed','paid') LIMIT 1"],
      ['passenger_join_synthetic', "SELECT p.id AS passenger_id, fs.passenger_id AS seat_owner, fs.seat FROM (SELECT 1 AS id, 7 AS reservation_id UNION ALL SELECT 2, 7) p JOIN (SELECT 1 AS passenger_id, 7 AS reservation_id, '1A' AS seat UNION ALL SELECT 2,7,'1B') fs ON fs.reservation_id = p.reservation_id"],
      ['seat_configuration', "SELECT total_capacity, seat_configuration FROM aircraft_types LIMIT 8"],
      ['negative_and_balance_counts', "SELECT COUNT(*) AS total_reservations, SUM(status = 'paid' AND paid_total < estimated_total) AS paid_with_balance, SUM(status = 'confirmed' AND paid_total < estimated_total) AS confirmed_with_balance FROM reservations"],
      ['partial_payment_checkin_counts', "SELECT COUNT(*) AS segments_with_balance_checked_in FROM flight_segments fs JOIN reservations r ON r.id = fs.reservation_id WHERE fs.checkin_status IN ('checked_in','boarded') AND r.paid_total < r.estimated_total"],
    ];
    for (const [name, sql] of checks) {
      try {
        const [rows] = await conn.query({ sql, timeout: 8000 });
        result.checks.push({ name, ok: true, rows });
      } catch (e) { result.checks.push({ name, ok: false, code: e.code, message: e.sqlMessage || e.message }); }
    }
    // Matches Usuario.generarCodigoMFA and the mysql2 timezone in config/db.js.
    const futureMfaExpiry = new Date(Date.now() + 5 * 60 * 1000);
    const [mfaClock] = await conn.query('SELECT CAST(? AS DATETIME) AS serialized_expiry, NOW() AS database_now, CAST(? AS DATETIME) > NOW() AS still_valid', [futureMfaExpiry, futureMfaExpiry]);
    result.checks.push({name:'mfa_expiry_with_actual_driver_timezone',ok:true,rows:mfaClock});
    const [indexes] = await conn.query("SHOW INDEX FROM dte_headers WHERE Key_name <> 'PRIMARY'");
    result.checks.push({name:'dte_indexes',ok:true,rows:indexes.map(r=>({key:r.Key_name,column:r.Column_name,unique:r.Non_unique===0}))});
    await conn.rollback();
  } catch (e) { result.connectionError = { code: e.code, message: 'Database connection or read-only setup failed; no mutations attempted.' }; }
  finally { if (conn) await conn.end(); }
  fs.writeFileSync(path.join(__dirname, 'db-readonly.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})().catch(e => { console.error(e.code || e.name); process.exitCode = 1; });
