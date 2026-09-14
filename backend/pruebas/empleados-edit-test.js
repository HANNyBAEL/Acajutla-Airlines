const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const empleadosController = require('../src/controllers/empleadosController');

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  });

  console.log('🧪 Probando actualización de empleados...');

  try {
    // 1. Crear empleado de prueba
    const testDoc = '9999' + Math.floor(1000 + Math.random() * 8999);
    const [ins] = await pool.query(
      "INSERT INTO employees (first_names, last_names, document_type, document_number, position, email, phone, hire_date, status) VALUES ('TestOriginal', 'Empleado', 'DUI', ?, 'Piloto', 'test@test.com', '70000000', CURDATE(), 'active')",
      [testDoc]
    );
    const empId = ins.insertId;
    console.log('  Empleado de prueba creado con ID:', empId);

    // 2. Probar actualización
    const reqMock = {
      params: { id: String(empId) },
      body: {
        first_names: 'TestEditado',
        last_names: 'EmpleadoActualizado',
        document_type: 'DUI',
        document_number: testDoc,
        position: 'Capitán',
        email: 'editado@test.com',
        phone: '79999999',
        emp_status: 'active'
      }
    };

    let responseData = null;
    let responseStatus = 200;
    const resMock = {
      status(code) { responseStatus = code; return this; },
      json(d) { responseData = d; return this; }
    };

    await empleadosController.actualizar(reqMock, resMock);

    if (responseStatus === 200 && responseData && responseData.exito) {
      console.log('  ✅ Actualización respondió 200 OK');
    } else {
      throw new Error('Actualización falló: HTTP ' + responseStatus + ' ' + JSON.stringify(responseData));
    }

    // 3. Verificar en base de datos
    const [rows] = await pool.query('SELECT * FROM employees WHERE id = ?', [empId]);
    if (rows[0].first_names === 'TestEditado' && rows[0].position === 'Capitán' && rows[0].phone === '79999999') {
      console.log('  ✅ Verificación en BD exitosa: datos modificados correctamente');
    } else {
      throw new Error('Los datos en la BD no coinciden con la actualización');
    }

    // 4. Limpieza
    await pool.query('DELETE FROM employees WHERE id = ?', [empId]);
    console.log('  Limpieza completada.');
    console.log('🎉 TODAS LAS PRUEBAS DE EDICIÓN DE EMPLEADOS PASARON.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
