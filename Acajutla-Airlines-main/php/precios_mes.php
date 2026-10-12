<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/conexion.php';

function responderPreciosMes($status, $body){
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if($_SERVER['REQUEST_METHOD'] !== 'GET') responderPreciosMes(405, ['ok' => false, 'error' => 'Método no permitido.']);
if(!CONEXION_OK) responderPreciosMes(500, ['ok' => false, 'error' => 'No se pudo consultar la disponibilidad.']);

$origen = isset($_GET['origen']) ? (string)$_GET['origen'] : '';
$destino = isset($_GET['destino']) ? (string)$_GET['destino'] : '';
$mes = isset($_GET['mes']) ? (string)$_GET['mes'] : '';
if(!ctype_digit($origen) || !ctype_digit($destino) || (int)$origen === (int)$destino || !preg_match('/^(\d{4})-(\d{2})$/', $mes, $partes)){
    cerrarConexion();
    responderPreciosMes(400, ['ok' => false, 'error' => 'Origen, destino o mes inválidos.']);
}
$anio = (int)$partes[1];
$mesNumero = (int)$partes[2];
if($anio < 2020 || !checkdate($mesNumero, 1, $anio)){
    cerrarConexion();
    responderPreciosMes(400, ['ok' => false, 'error' => 'El mes solicitado no es válido.']);
}
$desde = sprintf('%04d-%02d-01', $anio, $mesNumero);
$siguiente = (new DateTimeImmutable($desde))->modify('first day of next month')->format('Y-m-d');

$sql = "SELECT DATE(f.departure_datetime) AS fecha,
               MIN(COALESCE(ff.price, f.base_price)) AS precio
        FROM flights f
        INNER JOIN routes r ON r.id = f.route_id AND r.active = 1
        INNER JOIN airports ao ON ao.id = r.origin_id AND ao.active = 1
        INNER JOIN airports ad ON ad.id = r.destination_id AND ad.active = 1
        LEFT JOIN fare_classes fc ON fc.code = 'ECONOMICA' AND fc.active = 1
        LEFT JOIN flight_fares ff ON ff.flight_id = f.id AND ff.fare_class_id = fc.id AND ff.active = 1
        WHERE ao.id = ? AND ad.id = ?
          AND f.departure_datetime >= CONVERT_TZ(NOW(), '+00:00', '-06:00')
          AND f.departure_datetime >= ? AND f.departure_datetime < ?
          AND f.status NOT IN ('cancelled', 'completed', 'in_progress')
        GROUP BY DATE(f.departure_datetime)
        ORDER BY fecha ASC";
$stmt = mysqli_prepare($conexion, $sql);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar precios del mes: ' . mysqli_error($conexion));
    cerrarConexion();
    responderPreciosMes(500, ['ok' => false, 'error' => 'No se pudo consultar la disponibilidad.']);
}
$origenId = (int)$origen;
$destinoId = (int)$destino;
mysqli_stmt_bind_param($stmt, 'iiss', $origenId, $destinoId, $desde, $siguiente);
if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al consultar precios del mes: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderPreciosMes(500, ['ok' => false, 'error' => 'No se pudo consultar la disponibilidad.']);
}
$result = mysqli_stmt_get_result($stmt);
$data = [];
while($result && ($row = mysqli_fetch_assoc($result))){
    if($row['precio'] !== null && (float)$row['precio'] > 0){
        $data[] = ['fecha' => $row['fecha'], 'precio' => (float)$row['precio']];
    }
}
if($result) mysqli_free_result($result);
mysqli_stmt_close($stmt);
cerrarConexion();
responderPreciosMes(200, ['ok' => true, 'data' => $data]);
