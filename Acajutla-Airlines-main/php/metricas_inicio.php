<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

if(!CONEXION_OK){
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudo conectar con la base de datos.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "SELECT
            (SELECT COUNT(DISTINCT r.destination_id)
             FROM routes r
             INNER JOIN airports a ON a.id = r.destination_id
             WHERE r.active = 1 AND a.active = 1) AS destinos,
            (SELECT COUNT(*)
             FROM flights f
             INNER JOIN routes r ON r.id = f.route_id
             WHERE r.active = 1
               AND DATE(f.departure_datetime) = DATE(CONVERT_TZ(NOW(), '+00:00', '-06:00'))
               AND f.status <> 'cancelled') AS vuelos_diarios,
            (SELECT COUNT(DISTINCT at.id)
             FROM aircraft_types at
             INNER JOIN aircraft ac ON ac.type_id = at.id
             WHERE at.active = 1 AND ac.active = 1) AS tipos_aeronave";

$resultado = mysqli_query($conexion, $sql);
if(!$resultado){
    error_log('[Acajutla Airlines] Error al consultar métricas de inicio: ' . mysqli_error($conexion));
    cerrarConexion();
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'No se pudieron obtener las métricas.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$metricas = mysqli_fetch_assoc($resultado);
mysqli_free_result($resultado);
cerrarConexion();

http_response_code(200);
echo json_encode([
    'ok' => true,
    'data' => [
        'destinos' => (int)$metricas['destinos'],
        'vuelos_diarios' => (int)$metricas['vuelos_diarios'],
        'tipos_aeronave' => (int)$metricas['tipos_aeronave']
    ]
], JSON_UNESCAPED_UNICODE);
