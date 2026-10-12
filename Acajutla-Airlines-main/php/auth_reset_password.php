<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/auth_reset_password.php
 *
 * Endpoint: POST php/auth_reset_password.php
 * Payload esperado: { "token": "...", "password": "..." }
 *
 * Flujo:
 *   1) Validar que el token exista en password_resets y que no haya expirado (expires_at > NOW()).
 *   2) Validar longitud de la nueva contraseña.
 *   3) Actualizar users.password_hash con password_hash().
 *   4) Eliminar el token usado de password_resets.
 *   5) Responder éxito para que el frontend redirija al login.
 * =====================================================================
 */

date_default_timezone_set('America/El_Salvador');
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

function responderJson($codigoHttp, $body){
    http_response_code($codigoHttp);
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
if(!$raw || strlen($raw) > 10000){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Petición inválida.']);
}

$payload = json_decode($raw, true);
$token = isset($payload['token']) ? trim((string)$payload['token']) : '';
$tokenHash = hash('sha256', $token);
$password = isset($payload['password']) ? (string)$payload['password'] : '';

if(!preg_match('/^[a-f0-9]{64}$/i', $token)){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Token de restablecimiento inválido o no proporcionado.']);
}

if(strlen($password) < 10 || strlen($password) > 200){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'La contraseña debe tener entre 10 y 200 caracteres.']);
}

mysqli_begin_transaction($conexion);
// El token se guarda como hash y se consume dentro de la misma transacción.
$stmt = mysqli_prepare($conexion, "SELECT email FROM password_resets WHERE token = ? AND expires_at > NOW() LIMIT 1 FOR UPDATE");
if(!$stmt){
    error_log('[Reset Password] Error al preparar consulta token: ' . mysqli_error($conexion));
    mysqli_rollback($conexion);
    cerrarConexion();
    responderJson(500, ['ok' => false, 'mensaje' => 'Error interno al verificar el token.']);
}
mysqli_stmt_bind_param($stmt, 's', $tokenHash);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$fila = $res ? mysqli_fetch_assoc($res) : null;
mysqli_stmt_close($stmt);

if(!$fila || empty($fila['email'])){
    mysqli_rollback($conexion);
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'El enlace para restablecer contraseña ha expirado o ya fue utilizado. Por favor solicita uno nuevo.']);
}

$email = $fila['email'];
$passwordHash = password_hash($password, PASSWORD_DEFAULT);
try {
    $stmtUpd = mysqli_prepare($conexion, "UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?) AND status = 'active'");
    if(!$stmtUpd) throw new Exception('No se pudo preparar la actualización: ' . mysqli_error($conexion));
    mysqli_stmt_bind_param($stmtUpd, 'ss', $passwordHash, $email);
    if(!mysqli_stmt_execute($stmtUpd)) throw new Exception('No se pudo actualizar la contraseña: ' . mysqli_stmt_error($stmtUpd));
    if(mysqli_stmt_affected_rows($stmtUpd) !== 1) throw new Exception('No hay una cuenta activa para restablecer.');
    mysqli_stmt_close($stmtUpd);

    $stmtDel = mysqli_prepare($conexion, "DELETE FROM password_resets WHERE token = ?");
    if(!$stmtDel) throw new Exception('No se pudo invalidar el token usado.');
    mysqli_stmt_bind_param($stmtDel, 's', $tokenHash);
    if(!mysqli_stmt_execute($stmtDel) || mysqli_stmt_affected_rows($stmtDel) !== 1) throw new Exception('No se pudo consumir el token.');
    mysqli_stmt_close($stmtDel);

    mysqli_commit($conexion);
    cerrarConexion();
    responderJson(200, ['ok' => true, 'mensaje' => 'Tu contraseña ha sido restablecida con éxito.']);
} catch(Exception $e){
    mysqli_rollback($conexion);
    error_log('[Reset Password] Error transacción: ' . $e->getMessage());
    cerrarConexion();
    responderJson(500, ['ok' => false, 'mensaje' => 'No se pudo actualizar la contraseña. Intenta nuevamente.']);
}
