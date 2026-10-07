<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/consultar_reserva.php
 *
 * Endpoint: GET php/consultar_reserva.php?pnr=XXXXXX&ref=documento_o_correo
 *
 * Consulta REAL (no mock) de una reserva por PNR, validando un segundo
 * factor (documento o correo) antes de devolver cualquier dato — nunca
 * se entrega información de una reserva si el segundo dato no coincide.
 *
 * Fuentes reales usadas para validar "ref" (documento o correo), sin
 * inventar columnas:
 *   - customers.email / customers.document_number, vía
 *     reservations.customer_id (solo si la reserva se hizo con sesión
 *     iniciada — así lo guarda crear_reserva.php).
 *   - passengers.document_number de CUALQUIER pasajero de esa reserva
 *     (esto sí existe siempre, se guarde o no con sesión iniciada, porque
 *     crear_reserva.php inserta el documento de cada pasajero).
 *
 * LIMITACIÓN REAL Y HONESTA: crear_reserva.php nunca guarda el correo de
 * contacto de la reserva en ninguna tabla (reservations no tiene columna
 * de correo, y passengers.email nunca se inserta). Por lo tanto, una
 * reserva de INVITADO (sin sesión iniciada) solo puede validarse con el
 * DOCUMENTO de alguno de los pasajeros, no con el correo — porque el
 * correo de contacto de esa reserva no queda guardado en ninguna parte
 * consultable de la base de datos actual. No se inventa una columna para
 * resolver esto.
 *
 * Respuesta:
 *   Éxito: {"ok":true,"data":{pnr,estado,segmentos:[...],pasajeros:[...],pago:{...}}}
 *   No encontrada / ref no coincide: {"ok":true,"data":null}
 *   Error: {"ok":false,"error":"..."}
 * =====================================================================
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

function responderError($mensaje, $codigo){
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}
function responderNoEncontrada(){
    http_response_code(200);
    echo json_encode(['ok' => true, 'data' => null], JSON_UNESCAPED_UNICODE);
    exit;
}

if(!CONEXION_OK){
    responderError('No se pudo conectar con la base de datos.', 500);
}

$pnr = isset($_GET['pnr']) ? strtoupper(trim((string)$_GET['pnr'])) : '';
$ref = isset($_GET['ref']) ? trim((string)$_GET['ref']) : '';

if(!preg_match('/^[A-Z0-9]{3,20}$/', $pnr) || $ref === '' || strlen($ref) > 150){
    cerrarConexion();
    responderError('PNR o dato de verificación inválido.', 400);
}

$mapaEstado = [
    'pending' => 'PENDIENTE', 'waiting' => 'PENDIENTE',
    'paid' => 'CONFIRMADA', 'confirmed' => 'CONFIRMADA', 'completed' => 'CONFIRMADA',
    'cancelled' => 'CANCELADA',
];

// 1) Buscar la reserva por PNR, con los datos del cliente si tiene cuenta asociada.
$stmt = mysqli_prepare($conexion,
    "SELECT r.id, r.pnr, r.status, r.estimated_total, r.paid_total,
            c.email AS cliente_email, c.document_number AS cliente_documento
     FROM reservations r
     LEFT JOIN customers c ON c.id = r.customer_id
     WHERE r.pnr = ?"
);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar consulta de reserva: ' . mysqli_error($conexion));
    cerrarConexion();
    responderError('No se pudo consultar la reserva.', 500);
}
mysqli_stmt_bind_param($stmt, 's', $pnr);
mysqli_stmt_execute($stmt);
$resultado = mysqli_stmt_get_result($stmt);
$reserva = $resultado ? mysqli_fetch_assoc($resultado) : null;
if($resultado) mysqli_free_result($resultado);
mysqli_stmt_close($stmt);

if(!$reserva){
    cerrarConexion();
    responderNoEncontrada();
}

$reservationId = (int)$reserva['id'];

// 2) Traer pasajeros reales de esta reserva (documento válido para verificar
//    incluso en reservas de invitado).
$pasajeros = [];
$stmtPax = @mysqli_prepare($conexion,
    "SELECT first_names, last_names, document_number, email FROM passengers WHERE reservation_id = ?"
);
// Si falla porque la columna 'email' no existe en passengers, consultar sin ella
if(!$stmtPax){
    $stmtPax = mysqli_prepare($conexion,
        "SELECT first_names, last_names, document_number, NULL AS email FROM passengers WHERE reservation_id = ?"
    );
}
if($stmtPax){
    mysqli_stmt_bind_param($stmtPax, 'i', $reservationId);
    mysqli_stmt_execute($stmtPax);
    $resPax = mysqli_stmt_get_result($stmtPax);
    while($fila = mysqli_fetch_assoc($resPax)){
        $pasajeros[] = ['nombres' => $fila['first_names'], 'apellidos' => $fila['last_names'], 'documento' => $fila['document_number'], 'email' => $fila['email']];
    }
    if($resPax) mysqli_free_result($resPax);
    mysqli_stmt_close($stmtPax);
}

// 2-B) Buscar también si hay un correo de comprobante asociado en email_outbox
$correoOutbox = null;
$stmtOutbox = mysqli_prepare($conexion, "SELECT to_email FROM email_outbox WHERE ref_type = 'reservation' AND ref_id = ? ORDER BY id DESC LIMIT 1");
if($stmtOutbox){
    mysqli_stmt_bind_param($stmtOutbox, 's', $pnr);
    mysqli_stmt_execute($stmtOutbox);
    $resOutbox = mysqli_stmt_get_result($stmtOutbox);
    if($filaO = mysqli_fetch_assoc($resOutbox)){
        $correoOutbox = strtolower(trim((string)$filaO['to_email']));
    }
    if($resOutbox) mysqli_free_result($resOutbox);
    mysqli_stmt_close($stmtOutbox);
}

// 3) Validar el segundo factor (ref) contra: correo del cliente, documento
//    del cliente, documento de cualquier pasajero, o correo guardado en
//    el primer pasajero (para reservas de invitado). Comparación exacta,
//    sin distinguir mayúsculas/minúsculas para el correo.
$refLower = strtolower($ref);
$coincide = false;
if($reserva['cliente_email'] !== null && strtolower($reserva['cliente_email']) === $refLower){
    $coincide = true;
} elseif($reserva['cliente_documento'] !== null && $reserva['cliente_documento'] === $ref){
    $coincide = true;
} elseif($correoOutbox !== null && $correoOutbox === $refLower){
    $coincide = true;
} else {
    foreach($pasajeros as $p){
        if($p['documento'] !== null && $p['documento'] === $ref){
            $coincide = true;
            break;
        }
        // Correo guardado en el pasajero (para reservas de invitado)
        if($p['email'] !== null && strtolower($p['email']) === $refLower){
            $coincide = true;
            break;
        }
    }
}

if(!$coincide){
    cerrarConexion();
    responderNoEncontrada();
}

// 4) Traer los segmentos reales (uno por pasajero por tramo, con su asiento
//    real), y agruparlos visualmente por vuelo — SIN eliminar ni fusionar
//    ninguna fila real de flight_segments: cada pasajero conserva su propio
//    asiento dentro del grupo de su vuelo.
$segmentosPlanos = [];
$stmtSeg = mysqli_prepare($conexion,
    "SELECT f.flight_number, f.departure_datetime, f.arrival_datetime, fs.seat,
            fs.checkin_status, fs.boarding_pass_code,
            p.first_names, p.last_names,
            ao.iata_code AS origen_iata, ad.iata_code AS destino_iata
     FROM flight_segments fs
     INNER JOIN flights f ON f.id = fs.flight_id
     INNER JOIN routes r ON r.id = f.route_id
     INNER JOIN airports ao ON ao.id = r.origin_id
     INNER JOIN airports ad ON ad.id = r.destination_id
     INNER JOIN passengers p ON p.id = fs.passenger_id
     WHERE fs.reservation_id = ?
     ORDER BY f.departure_datetime ASC, fs.id ASC"
);
mysqli_stmt_bind_param($stmtSeg, 'i', $reservationId);
mysqli_stmt_execute($stmtSeg);
$resSeg = mysqli_stmt_get_result($stmtSeg);
while($fila = mysqli_fetch_assoc($resSeg)){
    $segmentosPlanos[] = $fila;
}
if($resSeg) mysqli_free_result($resSeg);
mysqli_stmt_close($stmtSeg);

// Agrupar por vuelo (numero_vuelo + fecha) conservando el orden de aparición.
$segmentos = [];
$indicePorVuelo = [];
foreach($segmentosPlanos as $fila){
    $clave = $fila['flight_number'] . '|' . substr((string)$fila['departure_datetime'], 0, 10);
    if(!isset($indicePorVuelo[$clave])){
        $indicePorVuelo[$clave] = count($segmentos);
        $segmentos[] = [
            'numero_vuelo' => $fila['flight_number'],
            'origen' => $fila['origen_iata'],
            'destino' => $fila['destino_iata'],
            'fecha' => substr((string)$fila['departure_datetime'], 0, 10),
            'salida_programada' => $fila['departure_datetime'],
            'llegada_programada' => $fila['arrival_datetime'],
            // Se conserva 'asiento' (del primer pasajero del grupo) para no
            // romper Vistas.tarjetaReserva(), que ya espera ese campo.
            'asiento' => $fila['seat'],
            'estado_check_in' => ($fila['checkin_status'] !== 'pending') ? 1 : 0,
            'pase_abordar_emitido' => $fila['boarding_pass_code'] !== null ? 1 : 0,
            'pasajeros_asientos' => []
        ];
    }
    $idx = $indicePorVuelo[$clave];
    $segmentos[$idx]['pasajeros_asientos'][] = [
        'nombre' => trim($fila['first_names'] . ' ' . $fila['last_names']),
        'asiento' => $fila['seat']
    ];
}

// 5) Traer el pago PRINCIPAL (type='payment'), nunca un refund, y traducir
//    method/status a etiquetas amigables sin inventar valores nuevos.
$mapaMetodoPagoLabel = ['card' => 'TARJETA', 'transfer' => 'TRANSFERENCIA / BANCA ELECTRÓNICA', 'cash' => 'EFECTIVO', 'paypal' => 'PAYPAL', 'other' => 'OTRO'];
$mapaEstadoPagoLabel = ['pending' => 'PENDIENTE', 'approved' => 'APROBADO', 'rejected' => 'RECHAZADO', 'pending_confirmation' => 'PENDIENTE DE CONFIRMACIÓN', 'refunded' => 'REEMBOLSADO', 'cancelled' => 'CANCELADO'];

$pago = ['metodo' => 'N/D', 'estado' => 'N/D', 'monto' => (float)($reserva['paid_total'] ?? $reserva['estimated_total'])];
$stmtPago = mysqli_prepare($conexion,
    "SELECT method, status, amount FROM payments WHERE reservation_id = ? AND type = 'payment' ORDER BY id DESC LIMIT 1"
);
if($stmtPago){
    mysqli_stmt_bind_param($stmtPago, 'i', $reservationId);
    mysqli_stmt_execute($stmtPago);
    $resPago = mysqli_stmt_get_result($stmtPago);
    $filaPago = $resPago ? mysqli_fetch_assoc($resPago) : null;
    if($resPago) mysqli_free_result($resPago);
    mysqli_stmt_close($stmtPago);
    if($filaPago){
        $metodoReal = (string)$filaPago['method'];
        $estadoReal2 = (string)$filaPago['status'];
        $pago = [
            'metodo' => $mapaMetodoPagoLabel[$metodoReal] ?? strtoupper($metodoReal),
            'estado' => $mapaEstadoPagoLabel[$estadoReal2] ?? strtoupper($estadoReal2),
            'monto' => (float)$filaPago['amount']
        ];
    }
}

cerrarConexion();

$estadoReal = strtolower((string)$reserva['status']);
http_response_code(200);
echo json_encode(['ok' => true, 'data' => [
    'pnr' => $reserva['pnr'],
    'estado' => $mapaEstado[$estadoReal] ?? strtoupper($estadoReal),
    'segmentos' => $segmentos,
    'pasajeros' => $pasajeros,
    'pago' => $pago
]], JSON_UNESCAPED_UNICODE);