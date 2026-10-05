const pool = require('./src/config/db');

async function check() {
  try {
    const [rows] = await pool.query("DESCRIBE dte_headers");
    console.log(rows.find(r => r.Field === 'id').Type);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
