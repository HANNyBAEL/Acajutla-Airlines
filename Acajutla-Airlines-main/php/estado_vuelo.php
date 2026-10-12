<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/estado_vuelo.php
 *
 * Endpoint: GET php/estado_vuelo.php?numero_vuelo=SKY-417&fecha=2026-09-25
 *
 * Consulta REAL (no mock) de un vuelo por número + fecha, usando el mismo
 * esquema/JOIN ya validado en php/buscar_vuelos.php (flights/routes/airports).
 *
 * No existen columnas de horario REAL (salida/llegada efectivas) en
 * `flights` — solo departure_datetime/arrival_datetime (programados) y
 * status/gate/terminal. No se inventan columnas de "hora real": el
 * frontend ya maneja mostrar "No registrada aún" cuando no se envían.
 *
 * Respuesta:
 *   Éxito: {"ok":true,"data":{numero_vuelo,estado,origen:{...},destino:{...},
 *           salida_programada,llegada_programada,puerta,terminal}}
 *   No encontrado: {"ok":true,"data":null}
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

if(!CONEXION_OK){
    responderError('No se pudo conectar con la base de datos.', 500);
}

$numeroVuelo = isset($_GET['numero_vuelo']) ? trim((string)$_GET['numero_vuelo']) : '';
$fecha = isset($_GET['fecha']) ? trim((string)$_GET['fecha']) : '';

if($numeroVuelo === '' || strlen($numeroVuelo) > 20){
    cerrarConexion();
    responderError('Número de vuelo inválido.', 400);
}

$usarFecha = $fecha !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha);

$sql = "SELECT f.flight_number, f.departure_datetime, f.arrival_datetime, f.status, f.gate, f.terminal,
               ao.id AS origen_id, ao.iata_code AS origen_iata, ao.icao_code AS origen_icao,
               ao.name AS origen_nombre, ao.city AS origen_ciudad, ao.country_code AS origen_pais, ao.timezone AS origen_tz,
               ad.id AS destino_id, ad.iata_code AS destino_iata, ad.icao_code AS destino_icao,
               ad.name AS destino_nombre, ad.city AS destino_ciudad, ad.country_code AS destino_pais, ad.timezone AS destino_tz
        FROM flights f
        INNER JOIN routes r ON f.route_id = r.id
        INNER JOIN airports ao ON r.origin_id = ao.id
        INNER JOIN airports ad ON r.destination_id = ad.id
        WHERE f.flight_number = ?";
if($usarFecha){
    $sql .= " AND DATE(f.departure_datetime) = ?";
}
$sql .= " ORDER BY f.departure_datetime DESC LIMIT 1";

$stmt = mysqli_prepare($conexion, $sql);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar estado_vuelo: ' . mysqli_error($conexion));
    cerrarConexion();
    responderError('No se pudo consultar el vuelo.', 500);
}
if($usarFecha){
    mysqli_stmt_bind_param($stmt, 'ss', $numeroVuelo, $fecha);
} else {
    mysqli_stmt_bind_param($stmt, 's', $numeroVuelo);
}
if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al ejecutar estado_vuelo: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudo consultar el vuelo.', 500);
}
$resultado = mysqli_stmt_get_result($stmt);
$fila = $resultado ? mysqli_fetch_assoc($resultado) : null;
if($resultado) mysqli_free_result($resultado);
mysqli_stmt_close($stmt);
cerrarConexion();

if(!$fila){
    http_response_code(200);
    echo json_encode(['ok' => true, 'data' => null], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(200);
echo json_encode(['ok' => true, 'data' => [
    'numero_vuelo' => $fila['flight_number'],
    'estado' => $fila['status'],
    'salida_programada' => $fila['departure_datetime'],
    'llegada_programada' => $fila['arrival_datetime'],
    'puerta' => $fila['gate'],
    'terminal' => $fila['terminal'],
    'origen' => [
        'id' => (int)$fila['origen_id'], 'codigo_iata' => $fila['origen_iata'], 'codigo_icao' => $fila['origen_icao'],
        'nombre' => $fila['origen_nombre'], 'ciudad' => $fila['origen_ciudad'], 'codigo_pais' => $fila['origen_pais'], 'zona_horaria' => $fila['origen_tz']
    ],
    'destino' => [
        'id' => (int)$fila['destino_id'], 'codigo_iata' => $fila['destino_iata'], 'codigo_icao' => $fila['destino_icao'],
        'nombre' => $fila['destino_nombre'], 'ciudad' => $fila['destino_ciudad'], 'codigo_pais' => $fila['destino_pais'], 'zona_horaria' => $fila['destino_tz']
    ]
]], JSON_UNESCAPED_UNICODE);
