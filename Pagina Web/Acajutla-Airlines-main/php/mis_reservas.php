<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/mis_reservas.php
 *
 * Endpoint: GET php/mis_reservas.php (requiere sesión PHP iniciada)
 *
 * Lista REAL (no mock) de las reservas del cliente autenticado, usando
 * la misma relación que ya usa php/crear_reserva.php al crear una
 * reserva: reservations.customer_id = customers.id.
 *
 * Las reservas de invitado se consultan por PNR y documento/correo en
 * consultar_reserva.php; nunca se autorizan con un ID o email de URL.
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
header('Cache-Control: no-store, private');

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/auth_session.php';

function responderError($mensaje, $codigo){
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    responderError('Método no permitido.', 405);
}
if(!CONEXION_OK){
    responderError('No se pudo conectar con la base de datos.', 500);
}

$clienteActual = obtenerClienteWebAutenticado($conexion);
if(!$clienteActual){
    cerrarConexion();
    responderError('Inicia sesión para consultar tus reservas.', 401);
}
$customerIdInt = (int)$clienteActual['id'];

$mapaEstado = [
    'pending' => 'PENDIENTE', 'waiting' => 'PENDIENTE',
    'paid' => 'CONFIRMADA', 'confirmed' => 'CONFIRMADA', 'completed' => 'CONFIRMADA',
    'cancelled' => 'CANCELADA',
];

// La lista usa la sesión del servidor; los customer_id y correos enviados desde el navegador no autorizan acceso.
$sql = "SELECT DISTINCT r.id, r.pnr, r.status, r.estimated_total, r.paid_total, r.created_at,
               (SELECT p.amount FROM payments p WHERE p.reservation_id = r.id AND p.type = 'payment' ORDER BY p.id DESC LIMIT 1) AS pago_monto
        FROM reservations r
        WHERE r.customer_id = ?
        ORDER BY r.created_at DESC";
$stmt = mysqli_prepare($conexion, $sql);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar mis_reservas: ' . mysqli_error($conexion));
    cerrarConexion();
    responderError('No se pudieron obtener tus reservas.', 500);
}
mysqli_stmt_bind_param($stmt, 'i', $customerIdInt);
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
    if($fila['pago_monto'] !== null){
        $total = (float)$fila['pago_monto'];
    } elseif($fila['estimated_total'] !== null && (float)$fila['estimated_total'] > 0){
        $total = (float)$fila['estimated_total'];
    } else {
        $total = (float)$fila['paid_total'];
    }
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
