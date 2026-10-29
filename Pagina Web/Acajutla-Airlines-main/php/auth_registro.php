<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/auth_registro.php
 *
 * Endpoint: POST php/auth_registro.php
 * Reemplaza, para Api.registrarCliente(), el modo mock (MOCK.clientes).
 *
 * Payload esperado (mismo que ya arma Auth.registrar() en index.php):
 *   { nombre, apellido, correo, telefono, documento, password }
 *
 * Flujo (dentro de una transacción, regla 9 del pedido):
 *   1) Validar campos.
 *   2) Rechazar si el correo ya existe en customers o en users.
 *   3) INSERT customers (role/status fijos: la cuenta creada desde la
 *      web pública siempre es 'customer'/'active').
 *   4) password_hash() -> INSERT users con customer_id = id del cliente.
 *   5) COMMIT. Si algo falla, ROLLBACK completo (nunca queda un cliente
 *      sin su cuenta o viceversa).
 *
 * El formulario captura el número de DUI y lo guarda con document_type
 * '13'. No captura nacionalidad, fecha de nacimiento ni dirección, por
 * lo que esas columnas no se incluyen en el INSERT.
 *
 * NOTA: users.username no tiene campo propio en el formulario de
 * registro; se usa el correo como username. Si users.username tiene una
 * restricción UNIQUE real no verificada aquí, un choque devolvería un
 * error genérico y seguro (nunca expone el detalle SQL al navegador).
 *
 * Respuesta (mismo contrato que ya espera Auth.registrar()):
 *   Éxito: {"ok":true,"cliente":{"id":.,"nombre":.,"apellido":.,"correo":.,"telefono":.,"documento":.}}
 *   Error: {"ok":false,"mensaje":"..."}
 * =====================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/auth_session.php';

function responderJson($codigo, $body){
    http_response_code($codigo);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    responderJson(400, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}
if(!CONEXION_OK){
    responderJson(500, ['ok' => false, 'mensaje' => 'No se pudo conectar con la base de datos.']);
}

$raw = file_get_contents('php://input');
if($raw === false || strlen($raw) === 0 || strlen($raw) > 50000){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Datos inválidos.']);
}
$payload = json_decode($raw, true);
if(json_last_error() !== JSON_ERROR_NONE || !is_array($payload)){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Datos inválidos.']);
}

function campoTexto($v, $maxLen){
    if(!is_string($v)) return null;
    $v = trim($v);
    if($v === '' || strlen($v) > $maxLen) return null;
    return $v;
}

$nombre = campoTexto($payload['nombre'] ?? null, 100);
$apellido = campoTexto($payload['apellido'] ?? null, 100);
$correo = isset($payload['correo']) ? trim((string)$payload['correo']) : '';
$telefono = campoTexto($payload['telefono'] ?? null, 20);
$documento = campoTexto($payload['documento'] ?? null, 30);
$password = isset($payload['password']) ? (string)$payload['password'] : '';

if(!$nombre || !$apellido || !$telefono || !$documento
    || !preg_match('/^\d{4}-\d{4}$/', $telefono)
    || !preg_match('/^\d{8}-\d$/', $documento)
    || !filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 150
    || $password === '' || strlen($password) > 200){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Completa todos los campos con teléfono, DUI, correo y contraseña válidos.']);
}

// Verificar correo duplicado en customers Y en users (regla 4 del pedido).
$stmtDup = mysqli_prepare($conexion, "SELECT 1 FROM users WHERE email = ? UNION SELECT 1 FROM customers WHERE email = ? LIMIT 1");
if(!$stmtDup){
    error_log('[Acajutla Airlines] Error al preparar verificación de correo duplicado: ' . mysqli_error($conexion));
    cerrarConexion();
    responderJson(500, ['ok' => false, 'mensaje' => 'No se pudo crear la cuenta. Intenta nuevamente.']);
}
mysqli_stmt_bind_param($stmtDup, 'ss', $correo, $correo);
mysqli_stmt_execute($stmtDup);
mysqli_stmt_store_result($stmtDup);
$yaExiste = mysqli_stmt_num_rows($stmtDup) > 0;
mysqli_stmt_close($stmtDup);

if($yaExiste){
    cerrarConexion();
    responderJson(409, ['ok' => false, 'mensaje' => 'El correo ya está registrado.']);
}

mysqli_begin_transaction($conexion);
try{
    // document_type por defecto es '13' (DUI según catálogo CAT-022 de El Salvador)
    $stmtCust = mysqli_prepare($conexion,
        "INSERT INTO customers (first_names, last_names, document_type, document_number, email, phone, registration_date, status)
         VALUES (?, ?, '13', ?, ?, ?, NOW(), 'active')"
    );
    if(!$stmtCust) throw new Exception('No se pudo preparar la inserción del cliente: ' . mysqli_error($conexion));
    mysqli_stmt_bind_param($stmtCust, 'sssss', $nombre, $apellido, $documento, $correo, $telefono);
    if(!mysqli_stmt_execute($stmtCust)) throw new Exception('No se pudo crear el cliente: ' . mysqli_stmt_error($stmtCust));
    $customerId = mysqli_insert_id($conexion);
    mysqli_stmt_close($stmtCust);

    $username = $correo; // el formulario no tiene campo de username propio
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmtUser = mysqli_prepare($conexion,
        "INSERT INTO users (username, email, password_hash, role, customer_id, status, created_at)
         VALUES (?, ?, ?, 'customer', ?, 'active', NOW())"
    );
    if(!$stmtUser) throw new Exception('No se pudo preparar la inserción del usuario: ' . mysqli_error($conexion));
    mysqli_stmt_bind_param($stmtUser, 'sssi', $username, $correo, $passwordHash, $customerId);
    if(!mysqli_stmt_execute($stmtUser)) throw new Exception('No se pudo crear la cuenta: ' . mysqli_stmt_error($stmtUser));
    mysqli_stmt_close($stmtUser);

    $userId = mysqli_insert_id($conexion);
    if(!establecerSesionWeb($userId)) throw new Exception('No se pudo iniciar una sesión segura.');
    mysqli_commit($conexion);

    cerrarConexion();
    responderJson(200, ['ok' => true, 'cliente' => [
        'id' => $customerId,
        'nombre' => $nombre,
        'apellido' => $apellido,
        'correo' => $correo,
        'telefono' => $telefono,
        'documento' => $documento
    ]]);
} catch(Exception $e){
    mysqli_rollback($conexion);
    if(session_status() === PHP_SESSION_ACTIVE){
        $_SESSION = [];
        session_destroy();
    }
    error_log('[Acajutla Airlines] Error al registrar cuenta: ' . $e->getMessage());
    cerrarConexion();
    responderJson(500, ['ok' => false, 'mensaje' => 'No se pudo crear la cuenta. Intenta nuevamente.']);
}
