<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/session_auth.php';

function responderMisReservas($status, $body){
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if($_SERVER['REQUEST_METHOD'] !== 'GET'){
    responderMisReservas(405, ['ok' => false, 'mensaje' => 'Método no permitido.']);
}
if(!CONEXION_OK){
    responderMisReservas(500, ['ok' => false, 'mensaje' => 'No se pudo conectar con la base de datos.']);
}

$usuario = usuarioSesionWeb($conexion);
if(!$usuario){
    cerrarConexion();
    responderMisReservas(401, ['ok' => false, 'mensaje' => 'Inicia sesión para consultar tus reservas.']);
}
if($usuario['customer_id'] === null){
    cerrarConexion();
    responderMisReservas(403, ['ok' => false, 'mensaje' => 'La cuenta no tiene un perfil de cliente asociado.']);
}

$sql = "SELECT r.pnr, r.status, r.estimated_total, r.paid_total, r.created_at
        FROM reservations r
        INNER JOIN customers c ON c.id = r.customer_id AND c.status = 'active'
        WHERE r.customer_id = ?
        ORDER BY r.created_at DESC";
$stmt = mysqli_prepare($conexion, $sql);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar mis_reservas: ' . mysqli_error($conexion));
    cerrarConexion();
    responderMisReservas(500, ['ok' => false, 'mensaje' => 'No se pudieron obtener tus reservas.']);
}

mysqli_stmt_bind_param($stmt, 'i', $usuario['customer_id']);
if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al ejecutar mis_reservas: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderMisReservas(500, ['ok' => false, 'mensaje' => 'No se pudieron obtener tus reservas.']);
}

$result = mysqli_stmt_get_result($stmt);
$mapaEstado = [
    'pending' => 'PENDIENTE', 'waiting' => 'PENDIENTE',
    'paid' => 'CONFIRMADA', 'confirmed' => 'CONFIRMADA', 'completed' => 'CONFIRMADA',
    'cancelled' => 'CANCELADA', 'expired' => 'VENCIDA'
];
$reservas = [];
while($result && ($row = mysqli_fetch_assoc($result))){
    $status = strtolower((string)$row['status']);
    $total = in_array($status, ['paid', 'confirmed', 'completed'], true)
        ? (float)$row['paid_total']
        : (float)$row['estimated_total'];
    $reservas[] = [
        'pnr' => $row['pnr'],
        'creado_en' => $row['created_at'],
        'estado' => $mapaEstado[$status] ?? strtoupper($status),
        'total' => $total
    ];
}
if($result) mysqli_free_result($result);
mysqli_stmt_close($stmt);
cerrarConexion();

responderMisReservas(200, ['ok' => true, 'data' => $reservas]);
