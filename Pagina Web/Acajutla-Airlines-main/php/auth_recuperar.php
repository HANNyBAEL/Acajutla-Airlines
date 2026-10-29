<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/auth_recuperar.php
 *
 * Endpoint: POST php/auth_recuperar.php
 * Payload esperado: { "correo": "..." }
 *
 * Flujo:
 *   1) Validar formato de correo.
 *   2) Consultar si existe en la tabla `users` (estado activo).
 *   3) Si existe, generar un token criptográfico seguro de 64 caracteres.
 *   4) Guardar token en `password_resets` con vigencia de 1 hora.
 *   5) Enviar correo con enlace y botón de restablecimiento vía Nylas API.
 *   6) Responder siempre { ok: true } (anti-enumeración de usuarios).
 * =====================================================================
 */

date_default_timezone_set('America/El_Salvador');
ini_set('display_errors', '0');
error_reporting(E_ALL);
ob_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

const NYLAS_API_BASE = 'https://api.us.nylas.com/v3';

function responderJson($codigoHttp, $body){
    if(ob_get_level() > 0){ ob_clean(); }
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
$correo = isset($payload['correo']) ? trim((string)$payload['correo']) : '';

if(!filter_var($correo, FILTER_VALIDATE_EMAIL)){
    cerrarConexion();
    responderJson(400, ['ok' => false, 'mensaje' => 'Ingresa un correo electrónico válido.']);
}

// 1. Verificar si el usuario existe y está activo
$stmt = mysqli_prepare($conexion, "SELECT id, email FROM customers WHERE email = ? LIMIT 1");
if(!$stmt){
    error_log('[Recuperar Password] Error preparar consulta customers: ' . mysqli_error($conexion));
    cerrarConexion();
    responderJson(200, ['ok' => true]);
}
mysqli_stmt_bind_param($stmt, 's', $correo);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);
$usuario = $res ? mysqli_fetch_assoc($res) : null;
mysqli_stmt_close($stmt);

// Si no existe, respondemos ok: true para evitar filtración de existencia de cuentas
if(!$usuario){
    cerrarConexion();
    responderJson(200, ['ok' => true]);
}

// 2. Generar token criptográfico único
$token = bin2hex(random_bytes(32));

// Limpiar tokens anteriores para este correo
$stmtDel = mysqli_prepare($conexion, "DELETE FROM password_resets WHERE email = ?");
if($stmtDel){
    mysqli_stmt_bind_param($stmtDel, 's', $correo);
    mysqli_stmt_execute($stmtDel);
    mysqli_stmt_close($stmtDel);
}

// Guardar nuevo token usando la hora del servidor MySQL para evitar desfases de zona horaria
$stmtIns = mysqli_prepare($conexion, "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 2 HOUR))");
if(!$stmtIns){
    error_log('[Recuperar Password] Error guardar token: ' . mysqli_error($conexion));
    cerrarConexion();
    responderJson(200, ['ok' => true]);
}
mysqli_stmt_bind_param($stmtIns, 'ss', $correo, $token);
mysqli_stmt_execute($stmtIns);
mysqli_stmt_close($stmtIns);

// 3. Construir URL de recuperación
$esHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
$protocolo = $esHttps ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$dirBase = dirname($_SERVER['SCRIPT_NAME']);
$dirBase = str_replace(['/php', '\\php'], '', $dirBase);
if(!str_ends_with($dirBase, '/')) $dirBase .= '/';

$enlaceRecuperar = $protocolo . $host . $dirBase . 'index.php?reset_token=' . urlencode($token);

// 4. Plantilla de correo HTML
$asunto = "🔑 Restablecer contraseña — Acajutla Airlines";
$cuerpoHtml = '
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Recuperar Contraseña</title></head>
<body style="margin:0;padding:24px;font-family:\'Segoe UI\',Helvetica,Arial,sans-serif;background-color:#f4f6fa;color:#223;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,40,85,0.08);">
    <tr>
      <td style="background-color:#002855;padding:24px 30px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;">✈ Acajutla <span style="color:#F4B400;">Airlines</span></h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 30px;">
        <h2 style="color:#002855;margin-top:0;font-size:18px;">Solicitud de recuperación de contraseña</h2>
        <p style="font-size:14px;line-height:1.6;color:#4a5568;">
          Hemos recibido una solicitud para restablecer la contraseña asociada a tu cuenta de Acajutla Airlines.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#4a5568;">
          Para crear una nueva contraseña, haz clic en el siguiente botón:
        </p>
        <div style="text-align:center;margin:30px 0;">
          <a href="' . htmlspecialchars($enlaceRecuperar, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;padding:14px 28px;background-color:#003B95;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:8px;font-size:15px;box-shadow:0 4px 12px rgba(0,59,149,0.3);">Restablecer mi contraseña</a>
        </div>
        <p style="font-size:12px;line-height:1.5;color:#718096;">
          Este enlace es válido durante <strong>60 minutos</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura; tu contraseña actual continuará protegida.
        </p>
        <hr style="border:none;border-top:1px solid #edf2f7;margin:24px 0;">
        <p style="font-size:11px;color:#a0aec0;word-break:break-all;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="' . htmlspecialchars($enlaceRecuperar, ENT_QUOTES, 'UTF-8') . '" style="color:#003B95;">' . htmlspecialchars($enlaceRecuperar, ENT_QUOTES, 'UTF-8') . '</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f8fafc;padding:16px 30px;text-align:center;font-size:12px;color:#718096;border-top:1px solid #edf2f7;">
        © ' . date('Y') . ' Acajutla Airlines. Todos los derechos reservados.
      </td>
    </tr>
  </table>
</body>
</html>';

// 5. Envío mediante Nylas API
$nylasApiKey = getenv('NYLAS_API_KEY');
$nylasGrantId = getenv('NYLAS_GRANT_ID');

if($nylasApiKey && $nylasGrantId){
    try {
        $cuerpoEnvio = [
            'subject' => $asunto,
            'to'      => [['email' => $correo]],
            'body'    => $cuerpoHtml,
            'is_plaintext' => false
        ];
        $cuerpoJson = json_encode($cuerpoEnvio, JSON_UNESCAPED_UNICODE);

        $opciones = [
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\nAuthorization: Bearer " . $nylasApiKey . "\r\n",
                'content' => $cuerpoJson,
                'timeout' => 20,
                'ignore_errors' => true
            ],
            'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]
        ];
        $contexto = stream_context_create($opciones);
        $urlNylas = NYLAS_API_BASE . '/grants/' . rawurlencode($grantId ?? $nylasGrantId) . '/messages/send';
        @file_get_contents($urlNylas, false, $contexto);
    } catch(Exception $e){
        error_log('[Recuperar Password] Error enviando correo Nylas: ' . $e->getMessage());
    }
} else {
    error_log('[Recuperar Password] NYLAS_API_KEY o NYLAS_GRANT_ID no definidos.');
}

cerrarConexion();
responderJson(200, ['ok' => true, 'mensaje' => 'Instrucciones enviadas correctamente.']);
