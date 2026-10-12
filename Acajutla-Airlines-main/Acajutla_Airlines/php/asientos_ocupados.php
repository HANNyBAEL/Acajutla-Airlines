<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/asientos_ocupados.php
 *
 * Endpoint: GET php/asientos_ocupados.php?vuelo_id=NN
 *
 * Consulta REAL (no mock) de qué asientos ya están ocupados para un
 * vuelo específico, usando el esquema real confirmado por el usuario:
 *
 *   flight_segments: flight_id, seat, status ENUM('confirmed','checked_in',
 *                    'boarded','no_show','cancelled')
 *   reservations:    status ENUM('pending','confirmed','paid','cancelled',
 *                    'completed','waiting'), time_limit
 *
 * Regla de "ocupado" (revisada y confirmada explícitamente por el usuario,
 * sin inventar valores de ENUM):
 *   - flight_segments.status <> 'cancelled' (es decir: confirmed, checked_in,
 *     boarded o no_show cuentan como ocupado — un check-in, abordaje o
 *     no-show siguen representando un asiento realmente vendido/asignado
 *     para ese vuelo; solo 'cancelled' libera el asiento)
 *   - flight_segments.seat no nulo
 *   - reservations.status <> 'cancelled'
 *   - si reservations.status = 'pending', solo cuenta como ocupado
 *     mientras time_limit no haya vencido (time_limit IS NULL o futuro)
 *   NOTA: se eliminó la exclusión de reservations.status='waiting' de una
 *   versión anterior — ningún flujo real del proyecto crea reservas en
 *   ese estado hoy, así que era una regla de negocio no verificada.
 *
 * Respuesta:
 *   { "ok": true,  "data": { "ocupados": ["5A","12C", ...] } }
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

$vueloId = isset($_GET['vuelo_id']) ? $_GET['vuelo_id'] : '';
if(!ctype_digit((string)$vueloId)){
    cerrarConexion();
    responderError('vuelo_id debe ser un identificador numérico válido.', 400);
}
$vueloIdInt = (int)$vueloId;

$sql = "SELECT fs.seat
        FROM flight_segments fs
        INNER JOIN reservations r ON r.id = fs.reservation_id
        WHERE fs.flight_id = ?
          AND fs.status <> 'cancelled'
          AND fs.seat IS NOT NULL
          AND r.status <> 'cancelled'
          AND (r.status <> 'pending' OR r.time_limit IS NULL OR r.time_limit > NOW())";

$stmt = mysqli_prepare($conexion, $sql);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar consulta de asientos ocupados: ' . mysqli_error($conexion));
    cerrarConexion();
    responderError('No se pudo consultar la disponibilidad de asientos.', 500);
}

mysqli_stmt_bind_param($stmt, 'i', $vueloIdInt);

if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al ejecutar consulta de asientos ocupados: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudo consultar la disponibilidad de asientos.', 500);
}

$resultado = mysqli_stmt_get_result($stmt);
if($resultado === false){
    error_log('[Acajutla Airlines] Error al obtener resultado de asientos ocupados: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudo consultar la disponibilidad de asientos.', 500);
}

$ocupados = [];
while($fila = mysqli_fetch_assoc($resultado)){
    $ocupados[] = $fila['seat'];
}

mysqli_free_result($resultado);
mysqli_stmt_close($stmt);
cerrarConexion();

http_response_code(200);
echo json_encode(['ok' => true, 'data' => ['ocupados' => $ocupados]], JSON_UNESCAPED_UNICODE);