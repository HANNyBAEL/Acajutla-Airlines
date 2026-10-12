<?php
/**
 * Checkout web server-to-server. Autoriza al dueño de la reserva en la
 * sesión PHP y delega el pago y el DTE al flujo compartido del backoffice.
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/session_auth.php';

function responderCheckout($datos, $codigo = 200){
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function errorCheckout($mensaje, $codigo){
    cerrarConexion();
    responderCheckout(['ok' => false, 'error' => $mensaje], $codigo);
}

if($_SERVER['REQUEST_METHOD'] !== 'POST') errorCheckout('Método no permitido.', 405);
if(!CONEXION_OK) errorCheckout('No se pudo conectar con la base de datos.', 500);

$raw = file_get_contents('php://input');
if($raw === false || strlen($raw) === 0 || strlen($raw) > 16000) errorCheckout('Solicitud inválida.', 400);
$payload = json_decode($raw, true);
if(json_last_error() !== JSON_ERROR_NONE || !is_array($payload)) errorCheckout('Solicitud inválida.', 400);

$reservationId = filter_var($payload['reservation_id'] ?? null, FILTER_VALIDATE_INT);
$pnr = strtoupper(trim((string)($payload['pnr'] ?? '')));
$metodoEntrada = strtoupper(trim((string)($payload['metodo'] ?? '')));
$detalle = isset($payload['detalle']) && is_array($payload['detalle']) ? $payload['detalle'] : [];
if(!$reservationId || !preg_match('/^[A-Z0-9]{6}$/', $pnr)) errorCheckout('Reserva inválida.', 400);
if(!in_array($metodoEntrada, ['TARJETA', 'TRANSFERENCIA', 'BILLETERA'], true)) errorCheckout('Método de pago inválido.', 400);

$usuario = usuarioSesionWeb($conexion);
$stmtReserva = mysqli_prepare($conexion,
    "SELECT r.id, r.pnr, r.customer_id, r.status, r.estimated_total, r.paid_total, r.currency,
            r.time_limit, r.time_limit < NOW() AS vencida,
            c.email AS customer_email, c.first_names AS customer_first_names, c.last_names AS customer_last_names,
            c.document_type AS customer_document_type, c.document_number AS customer_document_number,
            p.first_names AS passenger_first_names, p.last_names AS passenger_last_names,
            p.document_type AS passenger_document_type, p.document_number AS passenger_document_number
     FROM reservations r
     LEFT JOIN customers c ON c.id = r.customer_id
     LEFT JOIN passengers p ON p.id = (
       SELECT px.id FROM passengers px WHERE px.reservation_id = r.id ORDER BY px.id ASC LIMIT 1
     )
     WHERE r.id = ? AND r.pnr = ? LIMIT 1"
);
if(!$stmtReserva) errorCheckout('No se pudo validar la reserva.', 500);
mysqli_stmt_bind_param($stmtReserva, 'is', $reservationId, $pnr);
if(!mysqli_stmt_execute($stmtReserva)){
    mysqli_stmt_close($stmtReserva);
    errorCheckout('No se pudo validar la reserva.', 500);
}
$resReserva = mysqli_stmt_get_result($stmtReserva);
$reserva = $resReserva ? mysqli_fetch_assoc($resReserva) : null;
if($resReserva) mysqli_free_result($resReserva);
mysqli_stmt_close($stmtReserva);
if(!$reserva) errorCheckout('No se encontró la reserva.', 404);

$correoReceptor = '';
$nombreReceptor = '';
if($reserva['customer_id'] !== null){
    if(!$usuario || $usuario['role'] !== 'customer' || (int)$usuario['customer_id'] !== (int)$reserva['customer_id']){
        errorCheckout('Inicia sesión con la cuenta que creó esta reserva.', 403);
    }
    $correoReceptor = strtolower(trim((string)$reserva['customer_email']));
    $nombreReceptor = trim((string)$reserva['customer_first_names'] . ' ' . (string)$reserva['customer_last_names']);
} else {
    $reservasInvitado = isset($_SESSION['web_guest_reservations']) && is_array($_SESSION['web_guest_reservations'])
        ? $_SESSION['web_guest_reservations'] : [];
    $reservaInvitado = $reservasInvitado[(string)$reservationId] ?? null;
    if(!is_array($reservaInvitado) || strtoupper((string)($reservaInvitado['pnr'] ?? '')) !== $pnr){
        errorCheckout('La sesión ya no tiene acceso a esta reserva. Vuelve a crearla desde la web.', 403);
    }
    $correoReceptor = strtolower(trim((string)($reservaInvitado['email'] ?? '')));
    $nombreReceptor = trim((string)($reservaInvitado['nombre'] ?? ''));
}
if(!filter_var($correoReceptor, FILTER_VALIDATE_EMAIL)) errorCheckout('La reserva no tiene un correo válido para enviar la factura.', 400);
if($nombreReceptor === '') $nombreReceptor = trim((string)$reserva['passenger_first_names'] . ' ' . (string)$reserva['passenger_last_names']);
if($nombreReceptor === '') $nombreReceptor = 'CLIENTE FINAL';

// Si el navegador perdió la respuesta después de que el backend aprobara el
// pago, una repetición devuelve el resultado existente y jamás cobra otra vez.
if($reserva['status'] === 'paid'){
    $stmtPagoExistente = mysqli_prepare($conexion,
        "SELECT amount, method FROM payments WHERE reservation_id = ? AND type = 'payment' AND status = 'approved' ORDER BY id DESC LIMIT 1"
    );
    $pagoExistente = null;
    if($stmtPagoExistente){
        mysqli_stmt_bind_param($stmtPagoExistente, 'i', $reservationId);
        if(mysqli_stmt_execute($stmtPagoExistente)){
            $resPagoExistente = mysqli_stmt_get_result($stmtPagoExistente);
            $pagoExistente = $resPagoExistente ? mysqli_fetch_assoc($resPagoExistente) : null;
            if($resPagoExistente) mysqli_free_result($resPagoExistente);
        }
        mysqli_stmt_close($stmtPagoExistente);
    }
    $stmtDteExistente = mysqli_prepare($conexion,
        "SELECT uuid_generation, control_number FROM dte_headers
         WHERE reservation_id = ? AND dte_type IN ('01','03') AND transmission_status IN ('transmitted','accepted','contingency')
         ORDER BY id DESC LIMIT 1"
    );
    $facturaExistente = null;
    if($stmtDteExistente){
        mysqli_stmt_bind_param($stmtDteExistente, 'i', $reservationId);
        if(mysqli_stmt_execute($stmtDteExistente)){
            $resDteExistente = mysqli_stmt_get_result($stmtDteExistente);
            $dteExistente = $resDteExistente ? mysqli_fetch_assoc($resDteExistente) : null;
            if($resDteExistente) mysqli_free_result($resDteExistente);
            if($dteExistente){
                $facturaExistente = [
                    'numero_control' => $dteExistente['control_number'],
                    'uuid' => $dteExistente['uuid_generation'],
                    'enviado' => false,
                    'simulado' => false,
                    'error' => null
                ];
                $stmtEnvio = mysqli_prepare($conexion,
                    "SELECT status FROM email_outbox WHERE ref_type = 'dte' AND ref_id = ? ORDER BY id DESC LIMIT 1"
                );
                if($stmtEnvio){
                    mysqli_stmt_bind_param($stmtEnvio, 's', $dteExistente['uuid_generation']);
                    if(mysqli_stmt_execute($stmtEnvio)){
                        $resEnvio = mysqli_stmt_get_result($stmtEnvio);
                        $envioExistente = $resEnvio ? mysqli_fetch_assoc($resEnvio) : null;
                        if($resEnvio) mysqli_free_result($resEnvio);
                        if($envioExistente){
                            $facturaExistente['enviado'] = in_array($envioExistente['status'], ['sent', 'simulado'], true);
                            $facturaExistente['simulado'] = $envioExistente['status'] === 'simulado';
                        }
                    }
                    mysqli_stmt_close($stmtEnvio);
                }
            }
        }
        mysqli_stmt_close($stmtDteExistente);
    }
    cerrarConexion();
    responderCheckout(['ok' => true, 'data' => [
        'estado' => 'CONFIRMADA',
        'estado_pago' => 'approved',
        'metodo' => $metodoEntrada,
        'monto' => (float)($pagoExistente['amount'] ?? $reserva['estimated_total']),
        'mensaje' => $facturaExistente ? null : 'El pago ya está aprobado; la factura está pendiente de procesamiento.',
        'factura' => $facturaExistente
    ]]);
}

if(!in_array($reserva['status'], ['pending', 'confirmed'], true)) errorCheckout('La reserva ya no acepta pagos.', 409);
if($reserva['status'] === 'pending' && (int)$reserva['vencida'] === 1) errorCheckout('La reserva venció. Busca el vuelo nuevamente.', 409);

$stmtPendiente = mysqli_prepare($conexion,
    "SELECT id FROM payments
     WHERE reservation_id = ? AND type = 'payment' AND status = 'pending_confirmation'
       AND method = 'transfer' AND external_reference IS NOT NULL
     ORDER BY id DESC LIMIT 1"
);
if(!$stmtPendiente) errorCheckout('No se pudo revisar el estado del pago.', 500);
mysqli_stmt_bind_param($stmtPendiente, 'i', $reservationId);
mysqli_stmt_execute($stmtPendiente);
$resPendiente = mysqli_stmt_get_result($stmtPendiente);
$hayPendiente = $resPendiente && mysqli_num_rows($resPendiente) > 0;
if($resPendiente) mysqli_free_result($resPendiente);
mysqli_stmt_close($stmtPendiente);
if($hayPendiente) errorCheckout('Hay una transferencia pendiente de confirmación en el backoffice.', 409);

$monto = round((float)$reserva['estimated_total'] - (float)$reserva['paid_total'], 2);
if(!is_finite($monto) || $monto <= 0) errorCheckout('La reserva ya está pagada.', 409);

$metodoBackend = '';
$datosBackend = [
    'reservation_id' => (int)$reservationId,
    'pnr' => $pnr,
    'amount' => $monto,
    'tipo_dte' => '01',
    'receptor' => ['nombre' => $nombreReceptor, 'correo' => $correoReceptor]
];
$metadata = ['channel' => 'web_checkout'];

if($metodoEntrada === 'TARJETA'){
    $numero = preg_replace('/\D+/', '', (string)($detalle['numero'] ?? ''));
    $cvv = preg_replace('/\D+/', '', (string)($detalle['cvv'] ?? ''));
    $expiracion = trim((string)($detalle['expiracion'] ?? ''));
    if(!preg_match('/^\d{12,19}$/', $numero) || !preg_match('/^\d{3,4}$/', $cvv) || !preg_match('/^\d{2}\/\d{2}$/', $expiracion)){
        errorCheckout('Los datos de la tarjeta de prueba son inválidos.', 400);
    }
    $metodoBackend = 'card';
    $datosBackend['card'] = ['numero' => $numero, 'cvv' => $cvv, 'expiracion' => $expiracion];
} elseif($metodoEntrada === 'TRANSFERENCIA'){
    $banco = strtoupper(trim((string)($detalle['banco'] ?? '')));
    $referencia = trim((string)($detalle['referencia'] ?? ''));
    $bancosValidos = ['BANCO_AGRICOLA', 'BANCO_CUSCATLAN', 'BANCO_DAVIVIENDA', 'BANCO_PROMERICA'];
    if(!in_array($banco, $bancosValidos, true) || !preg_match('/^\d{4,20}$/', $referencia)){
        errorCheckout('El banco o la referencia de transferencia no son válidos.', 400);
    }
    $metodoBackend = 'transfer';
    $datosBackend['referencia'] = $referencia;
    $metadata['bank'] = $banco;
    $metadata['channel'] = 'bank_transfer';
} else {
    $wallet = strtoupper(trim((string)($detalle['billetera'] ?? '')));
    $cuenta = preg_replace('/\D+/', '', (string)($detalle['cuenta'] ?? ''));
    if(!in_array($wallet, ['TIGO_MONEY', 'CHIVO_WALLET', 'PAYPAL'], true) || !preg_match('/^\d{8}$/', $cuenta)){
        errorCheckout('La billetera o cuenta de prueba no son válidas.', 400);
    }
    $metadata['channel'] = 'digital_wallet';
    $metadata['wallet_provider'] = $wallet;
    if($wallet === 'PAYPAL'){
        $metodoBackend = 'paypal';
    } else {
        // Las billeteras locales se registran como transferencia simulada:
        // quedan pendientes y el backoffice debe confirmarlas manualmente.
        $metodoBackend = 'transfer';
        $datosBackend['referencia'] = 'WEB-' . $wallet . '-' . substr($cuenta, -4);
    }
}
$datosBackend['method'] = $metodoBackend;
$datosBackend['paymentMetadata'] = $metadata;

$esClienteRegistrado = $reserva['customer_id'] !== null;
$tipoDocumento = (string)($esClienteRegistrado
    ? ($reserva['customer_document_type'] ?? '')
    : ($reserva['passenger_document_type'] ?? ''));
$numeroDocumento = (string)($esClienteRegistrado
    ? ($reserva['customer_document_number'] ?? '')
    : ($reserva['passenger_document_number'] ?? ''));
$mapaDocumentoDte = [
    'DUI' => '13', '13' => '13',
    'NIT' => '36', '36' => '36',
    'Passport' => '3', 'PASSPORT' => '3', 'PASAPORTE' => '3', '03' => '3', '3' => '3'
];
if(isset($mapaDocumentoDte[$tipoDocumento]) && $numeroDocumento !== ''){
    $datosBackend['receptor']['tipoDocumento'] = $mapaDocumentoDte[$tipoDocumento];
    $datosBackend['receptor']['numDocumento'] = $numeroDocumento;
}

$apiUrl = trim((string)(getenv('WEB_CHECKOUT_API_URL') ?: 'http://127.0.0.1:3000/internal/web-checkout/pagos'));
$sharedSecret = (string)(getenv('WEB_CHECKOUT_SHARED_SECRET') ?: '');
if(strlen($sharedSecret) < 32) errorCheckout('El checkout web no está configurado en el servidor.', 503);
if(!function_exists('curl_init')) errorCheckout('El servidor PHP necesita la extensión cURL para procesar pagos.', 503);
$bodyNode = json_encode($datosBackend, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
if($bodyNode === false) errorCheckout('No se pudieron preparar los datos del pago.', 400);

$curl = curl_init($apiUrl);
curl_setopt_array($curl, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-Web-Checkout-Secret: ' . $sharedSecret
    ],
    CURLOPT_POSTFIELDS => $bodyNode,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 45
]);
$respuestaNode = curl_exec($curl);
$errorCurl = curl_error($curl);
$codigoNode = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);
if($respuestaNode === false){
    error_log('[Acajutla Airlines] No se pudo conectar el checkout web con el procesador interno: ' . $errorCurl);
    errorCheckout('No se pudo conectar con el procesador de pagos. Intenta nuevamente.', 502);
}
$resultadoNode = json_decode($respuestaNode, true);
if(!is_array($resultadoNode)) errorCheckout('El procesador devolvió una respuesta inválida.', 502);
if($codigoNode < 200 || $codigoNode >= 300){
    $mensaje = $codigoNode === 401 || $codigoNode === 503
        ? 'El procesador de pagos no está configurado. Contacta al equipo de soporte.'
        : (string)($resultadoNode['error'] ?? 'No se pudo procesar el pago.');
    $codigoCliente = in_array($codigoNode, [400, 404, 409, 429], true) ? $codigoNode : 502;
    errorCheckout($mensaje, $codigoCliente);
}

$pago = $resultadoNode['datos'] ?? [];
$estadoPago = (string)($pago['status'] ?? '');
$estadoReserva = (string)($pago['reservation_status'] ?? 'pending');
$estadoPublico = $estadoReserva === 'paid' ? 'CONFIRMADA' : 'PENDIENTE';
$dte = $resultadoNode['dte'] ?? null;
$factura = null;
if(is_array($dte) && !empty($dte['numeroControl'])){
    $factura = [
        'numero_control' => $dte['numeroControl'],
        'uuid' => $dte['uuid'] ?? null,
        'enviado' => (bool)($dte['envio']['enviado'] ?? false),
        'simulado' => (bool)($dte['envio']['simulado'] ?? false),
        'error' => $dte['error'] ?? ($dte['envio']['motivo'] ?? null)
    ];
}
$mensajePago = null;
if($estadoPago === 'rejected') $mensajePago = ($pago['gateway_message'] ?? null) ?: 'El pago fue rechazado. Puedes volver a intentarlo.';
if($estadoPago === 'pending_confirmation') $mensajePago = 'La transferencia quedó pendiente de confirmación por el backoffice.';
if($estadoPago === 'approved' && is_array($dte) && !empty($dte['error'])) $mensajePago = 'Pago aprobado; hubo un problema al generar la factura. Contacta al equipo de soporte.';
if($estadoPago === 'approved' && $estadoReserva === 'paid' && !$factura && !$mensajePago) $mensajePago = 'Pago aprobado; la factura está en proceso.';

cerrarConexion();
responderCheckout([
    'ok' => true,
    'data' => [
        'estado' => $estadoPublico,
        'estado_pago' => $estadoPago,
        'metodo' => $metodoEntrada,
        'monto' => (float)($pago['amount'] ?? $monto),
        'mensaje' => $mensajePago,
        'factura' => $factura
    ]
]);
