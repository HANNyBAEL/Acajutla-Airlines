<?php
/**
 * Proxy del checkout público hacia el flujo de pago compartido del backend.
 * La clave compartida vive solo en el servidor PHP y nunca se envía al browser.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
ini_set('display_errors', '0');

function responderPago($codigo, $body){
    http_response_code($codigo);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    responderPago(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

$secret = getenv('WEB_CHECKOUT_SHARED_SECRET') ?: '';
$apiUrl = getenv('WEB_CHECKOUT_API_URL') ?: 'http://127.0.0.1:3000/internal/web-checkout/pagos';
if(strlen($secret) < 32){
    responderPago(503, ['ok' => false, 'error' => 'El checkout web no está configurado en el servidor.']);
}
$scheme = strtolower((string)parse_url($apiUrl, PHP_URL_SCHEME));
$host = strtolower((string)parse_url($apiUrl, PHP_URL_HOST));
if(!filter_var($apiUrl, FILTER_VALIDATE_URL)
    || ($scheme !== 'https' && !in_array($host, ['127.0.0.1', 'localhost'], true))){
    responderPago(503, ['ok' => false, 'error' => 'La dirección del backend de pagos no es segura.']);
}

$raw = file_get_contents('php://input');
if($raw === false || strlen($raw) === 0 || strlen($raw) > 20000){
    responderPago(400, ['ok' => false, 'error' => 'Datos de pago inválidos.']);
}
$payload = json_decode($raw, true);
if(json_last_error() !== JSON_ERROR_NONE || !is_array($payload)){
    responderPago(400, ['ok' => false, 'error' => 'JSON inválido.']);
}

$reservationId = filter_var($payload['reservation_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$expires = filter_var($payload['checkout_expires'] ?? null, FILTER_VALIDATE_INT);
$token = is_string($payload['checkout_token'] ?? null) ? $payload['checkout_token'] : '';
$method = is_string($payload['method'] ?? null) ? $payload['method'] : '';
if(!$reservationId || !$expires || $expires <= time() || !preg_match('/^[a-f0-9]{64}$/', $token)){
    responderPago(401, ['ok' => false, 'error' => 'La autorización del checkout venció. Inicia la reserva nuevamente.']);
}
if(!in_array($method, ['card', 'transfer', 'paypal'], true)){
    responderPago(400, ['ok' => false, 'error' => 'Método de pago no soportado.']);
}

require_once __DIR__ . '/conexion.php';
if(!CONEXION_OK){
    responderPago(503, ['ok' => false, 'error' => 'No se pudo validar la reserva.']);
}
$stmt = mysqli_prepare($conexion,
    "SELECT pnr, status, estimated_total, (time_limit IS NULL OR time_limit > NOW()) AS vigente
     FROM reservations WHERE id = ? LIMIT 1"
);
if(!$stmt){
    cerrarConexion();
    responderPago(500, ['ok' => false, 'error' => 'No se pudo validar la reserva.']);
}
mysqli_stmt_bind_param($stmt, 'i', $reservationId);
if(!mysqli_stmt_execute($stmt)){
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderPago(500, ['ok' => false, 'error' => 'No se pudo validar la reserva.']);
}
$result = mysqli_stmt_get_result($stmt);
$reservation = $result ? mysqli_fetch_assoc($result) : null;
if($result) mysqli_free_result($result);
mysqli_stmt_close($stmt);
cerrarConexion();

if(!$reservation){
    responderPago(404, ['ok' => false, 'error' => 'No se encontró la reserva.']);
}
$expectedToken = hash_hmac('sha256', $reservationId . '|' . $reservation['pnr'] . '|' . $expires, $secret);
if(!hash_equals($expectedToken, $token)){
    responderPago(401, ['ok' => false, 'error' => 'La autorización del checkout no es válida.']);
}
if($reservation['status'] !== 'pending' || (int)$reservation['vigente'] !== 1){
    responderPago(409, ['ok' => false, 'error' => 'La reserva venció o ya no admite pagos.']);
}
$amount = round((float)$reservation['estimated_total'], 2);
$browserAmount = isset($payload['amount']) && is_numeric($payload['amount']) ? (int)round((float)$payload['amount'] * 100) : null;
if($browserAmount === null || $browserAmount !== (int)round($amount * 100)){
    responderPago(409, ['ok' => false, 'error' => 'El importe no coincide con el total validado por el sistema.']);
}

$body = [
    'reservation_id' => (int)$reservationId,
    'amount' => $amount,
    'method' => $method,
    'tipo_dte' => '01'
];
if($method === 'card'){
    $card = $payload['card'] ?? null;
    if(!is_array($card)
        || !is_string($card['numero'] ?? null)
        || !is_string($card['cvv'] ?? null)
        || !is_string($card['expiracion'] ?? null)){
        responderPago(400, ['ok' => false, 'error' => 'Datos de tarjeta incompletos.']);
    }
    $body['card'] = [
        'numero' => preg_replace('/\s+/', '', $card['numero']),
        'cvv' => $card['cvv'],
        'expiracion' => $card['expiracion']
    ];
}
if($method === 'transfer'){
    $reference = is_string($payload['referencia'] ?? null) ? trim($payload['referencia']) : '';
    if($reference === '' || strlen($reference) > 100){
        responderPago(400, ['ok' => false, 'error' => 'Referencia de transferencia inválida.']);
    }
    $body['referencia'] = $reference;
}
if(isset($payload['paymentMetadata']) && is_array($payload['paymentMetadata'])){
    $body['paymentMetadata'] = $payload['paymentMetadata'];
}
if(isset($payload['receptor']) && is_array($payload['receptor'])){
    $body['receptor'] = $payload['receptor'];
}

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-Web-Checkout-Secret: ' . $secret
    ],
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 35
]);
$responseBody = curl_exec($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if($responseBody === false || $httpCode < 200 || $httpCode >= 300){
    error_log('[Acajutla Airlines] Checkout web: backend de pagos respondió HTTP ' . $httpCode . ' ' . $curlError);
    $decoded = is_string($responseBody) ? json_decode($responseBody, true) : null;
    $message = is_array($decoded) && is_string($decoded['error'] ?? null)
        ? $decoded['error']
        : 'No se pudo registrar el pago. Intenta nuevamente.';
    responderPago($httpCode >= 400 && $httpCode < 500 ? $httpCode : 502, ['ok' => false, 'error' => $message]);
}

$decoded = json_decode($responseBody, true);
if(!is_array($decoded) || empty($decoded['exito']) || !isset($decoded['datos'])){
    error_log('[Acajutla Airlines] Checkout web: respuesta inesperada del backend de pagos.');
    responderPago(502, ['ok' => false, 'error' => 'El backend no devolvió un resultado de pago válido.']);
}
responderPago(200, ['ok' => true, 'data' => $decoded]);
