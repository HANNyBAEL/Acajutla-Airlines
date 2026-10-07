<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/mis_reservas.php
 *
 * Endpoint: GET php/mis_reservas.php?customer_id=NN
 *
 * Lista REAL (no mock) de las reservas del cliente autenticado, usando
 * la misma relación que ya usa php/crear_reserva.php al crear una
 * reserva: reservations.customer_id = customers.id.
 *
 * IMPORTANTE — limitación real y honesta del esquema actual: una reserva
 * hecha SIN haber iniciado sesión (invitado) se guarda con
 * reservations.customer_id = NULL (así lo hace crear_reserva.php). Esa
 * reserva de invitado NO puede vincularse retroactivamente a una cuenta
 * por este endpoint, porque no existe ninguna columna que guarde el
 * correo de contacto en `reservations` ni en `passengers` (crear_reserva.php
 * no lo inserta). Esto no es un bug de este endpoint: es el
 * comportamiento correcto dado lo que el esquema realmente guarda hoy.
 * Solo se listan reservas hechas MIENTRAS la cuenta estaba autenticada.
 *
 * Mapeo de reservations.status (ENUM real) a las etiquetas en español
 * que ya usa Vistas (mismo mapa que usa el resto del proyecto para
 * mostrar reservas, sin inventar estados nuevos):
 *   pending   -> PENDIENTE
 *   waiting   -> PENDIENTE
 *   paid      -> CONFIRMADA
 *   confirmed -> CONFIRMADA
 *   completed -> CONFIRMADA
 *   cancelled -> CANCELADA
 *
 * Respuesta:
 *   { "ok": true, "data": [ {pnr, creado_en, estado, total}, ... ] }
 *   { "ok": false, "error": "..." }
 * =====================================================================
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

function responderError($mensaje, $codigo){
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if(!CONEXION_OK){
    responderError('No se pudo conectar con la base de datos.', 500);
}

$customerId = isset($_GET['customer_id']) ? $_GET['customer_id'] : '';
$emailParam  = isset($_GET['email']) ? strtolower(trim((string)$_GET['email'])) : '';

$customerIdInt = ctype_digit((string)$customerId) ? (int)$customerId : null;

if(!$customerIdInt && (!filter_var($emailParam, FILTER_VALIDATE_EMAIL))){
    cerrarConexion();
    responderError('Se requiere customer_id numérico o un email válido.', 400);
}

// Si no se pasó customer_id pero sí email, buscar el customer_id
if(!$customerIdInt && $emailParam !== ''){
    $stmtC = mysqli_prepare($conexion, "SELECT id FROM customers WHERE LOWER(email) = ? LIMIT 1");
    if($stmtC){
        mysqli_stmt_bind_param($stmtC, 's', $emailParam);
        mysqli_stmt_execute($stmtC);
        $resC = mysqli_stmt_get_result($stmtC);
        if($fC = mysqli_fetch_assoc($resC)){
            $customerIdInt = (int)$fC['id'];
        }
        if($resC) mysqli_free_result($resC);
        mysqli_stmt_close($stmtC);
    }
}

// Obtener el correo del cliente para buscar también reservas hechas con su correo
$emailCliente = $emailParam;
if($customerIdInt){
    $stmtEmailCust = mysqli_prepare($conexion, "SELECT email FROM customers WHERE id = ?");
    if($stmtEmailCust){
        mysqli_stmt_bind_param($stmtEmailCust, 'i', $customerIdInt);
        mysqli_stmt_execute($stmtEmailCust);
        $resEC = mysqli_stmt_get_result($stmtEmailCust);
        if($filaEC = mysqli_fetch_assoc($resEC)){
            $emailEncontrado = strtolower(trim((string)$filaEC['email']));
            if($emailEncontrado !== '') $emailCliente = $emailEncontrado;
        }
        if($resEC) mysqli_free_result($resEC);
        mysqli_stmt_close($stmtEmailCust);
    }
}

$mapaEstado = [
    'pending' => 'PENDIENTE', 'waiting' => 'PENDIENTE',
    'paid' => 'CONFIRMADA', 'confirmed' => 'CONFIRMADA', 'completed' => 'CONFIRMADA',
    'cancelled' => 'CANCELADA',
];

// 1. Vincular reservas huérfanas que tengan comprobante enviado a este correo si tenemos customer_id
if($emailCliente !== '' && $customerIdInt){
    $stmtSync = @mysqli_prepare($conexion,
        "UPDATE reservations r
         INNER JOIN email_outbox e ON e.ref_type = 'reservation' AND e.ref_id COLLATE utf8mb4_unicode_ci = r.pnr COLLATE utf8mb4_unicode_ci
         SET r.customer_id = ?
         WHERE r.customer_id IS NULL AND LOWER(e.to_email) = ?"
    );
    if($stmtSync){
        mysqli_stmt_bind_param($stmtSync, 'is', $customerIdInt, $emailCliente);
        @mysqli_stmt_execute($stmtSync);
        mysqli_stmt_close($stmtSync);
    }
}

// 2. Consulta principal: listar reservas por customer_id
// O aquellas cuyo PNR esté en email_outbox enviado a su correo
$sql = "SELECT DISTINCT r.pnr, r.status, r.estimated_total, r.paid_total, r.created_at
        FROM reservations r
        LEFT JOIN email_outbox e ON e.ref_type = 'reservation' AND e.ref_id COLLATE utf8mb4_unicode_ci = r.pnr COLLATE utf8mb4_unicode_ci
        WHERE ( ? IS NOT NULL AND r.customer_id = ? )
           OR ( ? <> '' AND LOWER(e.to_email) = ? )
        ORDER BY r.created_at DESC";
$stmt = mysqli_prepare($conexion, $sql);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar mis_reservas: ' . mysqli_error($conexion));
    cerrarConexion();
    responderError('No se pudieron obtener tus reservas.', 500);
}
mysqli_stmt_bind_param($stmt, 'iiss', $customerIdInt, $customerIdInt, $emailCliente, $emailCliente);
if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al ejecutar mis_reservas: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudieron obtener tus reservas.', 500);
}
$resultado = mysqli_stmt_get_result($stmt);
if($resultado === false){
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudieron obtener tus reservas.', 500);
}

$reservas = [];
while($fila = mysqli_fetch_assoc($resultado)){
    $estadoReal = strtolower((string)$fila['status']);
    $total = $fila['paid_total'] !== null ? (float)$fila['paid_total'] : (float)$fila['estimated_total'];
    $reservas[] = [
        'pnr' => $fila['pnr'],
        'creado_en' => $fila['created_at'],
        'estado' => $mapaEstado[$estadoReal] ?? strtoupper($estadoReal),
        'total' => $total
    ];
}
mysqli_free_result($resultado);
mysqli_stmt_close($stmt);
cerrarConexion();

http_response_code(200);
echo json_encode(['ok' => true, 'data' => $reservas], JSON_UNESCAPED_UNICODE);
