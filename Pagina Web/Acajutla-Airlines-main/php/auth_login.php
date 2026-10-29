<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/auth_login.php
 *
 * Endpoint: POST php/auth_login.php
 * Reemplaza, para Api.iniciarSesion(), el modo mock (MOCK.clientes).
 *
 * Payload esperado: { correo, password }
 *
 * Flujo:
 *   1) Buscar en users por email.
 *   2) password_verify() contra users.password_hash (nunca comparación
 *      en texto plano). Mensaje genérico igual si el correo no existe o
 *      si la contraseña es incorrecta (no revela cuál de las dos falló).
 *   3) Rechazar si users.status <> 'active'.
 *   4) Si users.customer_id existe, traer los datos del cliente.
 *   5) Actualizar users.last_login (no crítico: si falla, no bloquea el login).
 *
 * Respuesta (mismo contrato que ya espera Auth.login(), res.cliente.nombre):
 *   Éxito: {"ok":true,"cliente":{"id":.,"nombre":.,"apellido":.,"correo":.,"telefono":.,"documento":.}}
 *   Error: {"ok":false,"mensaje":"..."}
 *
 * Nunca se devuelve password_hash ni ningún otro dato sensible de users.
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
if($raw === false || strlen($raw) === 0 || strlen($raw) > 10000){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Datos inválidos.']);
}
$payload = json_decode($raw, true);
if(json_last_error() !== JSON_ERROR_NONE || !is_array($payload)){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Datos inválidos.']);
}

$correo = isset($payload['correo']) ? trim((string)$payload['correo']) : '';
$password = isset($payload['password']) ? (string)$payload['password'] : '';

if(!filter_var($correo, FILTER_VALIDATE_EMAIL) || $password === ''){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Correo o contraseña incorrectos.']);
}

$stmt = mysqli_prepare($conexion, "SELECT id, password_hash, status, role, customer_id FROM users WHERE email = ?");
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar login: ' . mysqli_error($conexion));
    cerrarConexion();
    responderJson(500, ['ok' => false, 'mensaje' => 'No se pudo iniciar sesión. Intenta nuevamente.']);
}
mysqli_stmt_bind_param($stmt, 's', $correo);
if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al ejecutar login: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderJson(500, ['ok' => false, 'mensaje' => 'No se pudo iniciar sesión. Intenta nuevamente.']);
}
$resultado = mysqli_stmt_get_result($stmt);
$usuario = $resultado ? mysqli_fetch_assoc($resultado) : null;
if($resultado) mysqli_free_result($resultado);
mysqli_stmt_close($stmt);

// Mismo mensaje genérico si el correo no existe o si la contraseña es
// incorrecta: no revela si una dirección de correo está registrada.
$credencialesInvalidas = !$usuario || !password_verify($password, $usuario['password_hash']);
if($credencialesInvalidas){
    cerrarConexion();
    responderJson(401, ['ok' => false, 'mensaje' => 'Correo o contraseña incorrectos.']);
}

if($usuario['status'] !== 'active'){
    cerrarConexion();
    responderJson(403, ['ok' => false, 'mensaje' => 'Esta cuenta no está activa.']);
}
if($usuario['role'] !== 'customer'){
    cerrarConexion();
    responderJson(401, ['ok' => false, 'mensaje' => 'Correo o contraseña incorrectos.']);
}

// Buscar el customer asociado. El login público solo admite cuentas customer.
$clienteData = ['id' => null, 'nombre' => '', 'apellido' => '', 'correo' => $correo, 'telefono' => '', 'documento' => ''];

$cust = null;
if($usuario['customer_id'] !== null){
    $stmtC = mysqli_prepare($conexion, "SELECT id, first_names, last_names, email, phone, document_number FROM customers WHERE id = ? AND status = 'active'");
    if($stmtC){
        $customerId = (int)$usuario['customer_id'];
        mysqli_stmt_bind_param($stmtC, 'i', $customerId);
        mysqli_stmt_execute($stmtC);
        $resC = mysqli_stmt_get_result($stmtC);
        $cust = $resC ? mysqli_fetch_assoc($resC) : null;
        if($resC) mysqli_free_result($resC);
        mysqli_stmt_close($stmtC);
    }
}

// Fallback: Si users.customer_id era NULL o no se encontró, buscar en customers por email
if(!$cust){
    $stmtCEmail = mysqli_prepare($conexion, "SELECT id, first_names, last_names, email, phone, document_number FROM customers WHERE email = ? AND status = 'active' LIMIT 1");
    if($stmtCEmail){
        mysqli_stmt_bind_param($stmtCEmail, 's', $correo);
        mysqli_stmt_execute($stmtCEmail);
        $resCEmail = mysqli_stmt_get_result($stmtCEmail);
        $cust = $resCEmail ? mysqli_fetch_assoc($resCEmail) : null;
        if($resCEmail) mysqli_free_result($resCEmail);
        mysqli_stmt_close($stmtCEmail);

        // Si se encontró, vincularlo en users para futuras sesiones
        if($cust && isset($cust['id'])){
            $stmtLink = mysqli_prepare($conexion, "UPDATE users SET customer_id = ? WHERE id = ?");
            if($stmtLink){
                $cid = (int)$cust['id'];
                $uid = (int)$usuario['id'];
                mysqli_stmt_bind_param($stmtLink, 'ii', $cid, $uid);
                mysqli_stmt_execute($stmtLink);
                mysqli_stmt_close($stmtLink);
            }
        }
    }
}

if($cust){
    $clienteData = [
        'id' => (int)$cust['id'],
        'nombre' => $cust['first_names'] ?: '',
        'apellido' => $cust['last_names'] ?: '',
        'correo' => $cust['email'] ?: $correo,
        'telefono' => $cust['phone'] ?: '',
        'documento' => $cust['document_number'] ?: ''
    ];

} else {
    cerrarConexion();
    responderJson(403, ['ok' => false, 'mensaje' => 'La cuenta no tiene un perfil de cliente activo.']);
}

// Actualizar last_login. No crítico: si falla, no impide el inicio de sesión.
$stmtUpd = mysqli_prepare($conexion, "UPDATE users SET last_login = NOW() WHERE id = ?");
if($stmtUpd){
    mysqli_stmt_bind_param($stmtUpd, 'i', $usuario['id']);
    mysqli_stmt_execute($stmtUpd);
    mysqli_stmt_close($stmtUpd);
}

if(empty($clienteData['id']) || !establecerSesionWeb((int)$usuario['id'])){
    cerrarConexion();
    responderJson(500, ['ok' => false, 'mensaje' => 'No se pudo iniciar una sesión segura. Intenta nuevamente.']);
}

cerrarConexion();
responderJson(200, ['ok' => true, 'cliente' => $clienteData]);
