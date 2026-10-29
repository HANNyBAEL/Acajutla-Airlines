<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/vuelos_en_vuelo.php
 *
 * Endpoint: GET php/vuelos_en_vuelo.php
 *
 * Lista REAL (no mock) de los vuelos que están EN EL AIRE en este momento,
 * para la sección "Vuelos en vivo" (mapa tipo FlightRadar24).
 *
 * Un vuelo está en el aire si la hora actual del servidor está entre su
 * salida y llegada programadas (flights no tiene columnas de horario real,
 * igual que php/estado_vuelo.php: no se inventan columnas).
 *
 * El progreso (0-1) se calcula en el servidor. Se devuelven también los
 * timestamps Unix de salida/llegada/ahora para que el navegador avance el
 * reloj sincronizado con el servidor (independiente del reloj del cliente).
 *
 * Respuesta:
 *   {"ok":true,"ahora_ts":NNN,"data":[{numero_vuelo, origen:{...}, destino:{...},
 *     salida_ts, llegada_ts, progreso, minutos_transcurridos, minutos_restantes,
 *     distancia_km, duracion_minutos, aeronave:{matricula,modelo,fabricante}, estado}, ...]}
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

$sql = "SELECT f.flight_number, f.status, f.departure_datetime, f.arrival_datetime,
               r.distance_km, r.estimated_duration_minutes,
               ao.iata_code AS origen_iata, ao.city AS origen_ciudad, ao.name AS origen_nombre, ao.country_code AS origen_pais,
               ad.iata_code AS destino_iata, ad.city AS destino_ciudad, ad.name AS destino_nombre, ad.country_code AS destino_pais,
               ac.registration AS aeronave_matricula, act.model AS aeronave_modelo, act.manufacturer AS aeronave_fabricante
        FROM flights f
        INNER JOIN routes r ON f.route_id = r.id
        INNER JOIN airports ao ON r.origin_id = ao.id
        INNER JOIN airports ad ON r.destination_id = ad.id
        LEFT JOIN aircraft ac ON f.aircraft_id = ac.id
        LEFT JOIN aircraft_types act ON ac.type_id = act.id
        WHERE f.status <> 'cancelled'
          AND f.departure_datetime <= CONVERT_TZ(NOW(), '+00:00', '-06:00')
          AND f.arrival_datetime   >= CONVERT_TZ(NOW(), '+00:00', '-06:00')
        ORDER BY f.departure_datetime ASC";

$stmt = mysqli_prepare($conexion, $sql);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar vuelos_en_vuelo: ' . mysqli_error($conexion));
    cerrarConexion();
    responderError('No se pudieron obtener los vuelos en vivo.', 500);
}
if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al ejecutar vuelos_en_vuelo: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudieron obtener los vuelos en vivo.', 500);
}
$resultado = mysqli_stmt_get_result($stmt);
if($resultado === false){
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudieron obtener los vuelos en vivo.', 500);
}

// Los datos en BD están en hora local El Salvador (UTC-6).
// strtotime() en Aiven (UTC) los interpreta como UTC: los timestamps
// son coherentes entre sí para calcular duración y progreso, pero
// NO se deben convertir con toLocaleTimeString (que resta 6 h más).
// $ahoraTs debe estar en la misma escala que los timestamps de BD
// (hora local SV leída como si fuera UTC por strtotime en Aiven).
// time() es UTC real → restar 6h da la hora local SV en esa misma escala.
$ahoraTs = time() - 6 * 3600;

$vuelos = [];
while($fila = mysqli_fetch_assoc($resultado)){
    $salidaTs = strtotime((string)$fila['departure_datetime']);
    $llegadaTs = strtotime((string)$fila['arrival_datetime']);
    if($salidaTs === false || $llegadaTs === false || $llegadaTs <= $salidaTs) continue;

    $progreso = ($ahoraTs - $salidaTs) / ($llegadaTs - $salidaTs);
    if($progreso < 0) $progreso = 0.0;
    if($progreso > 1) $progreso = 1.0;

    $duracionMin = round(($llegadaTs - $salidaTs) / 60);

    $vuelos[] = [
        'numero_vuelo' => $fila['flight_number'],
        'estado' => $fila['status'],
        'origen' => [
            'codigo_iata' => $fila['origen_iata'],
            'ciudad' => $fila['origen_ciudad'],
            'nombre' => $fila['origen_nombre'],
            'codigo_pais' => $fila['origen_pais']
        ],
        'destino' => [
            'codigo_iata' => $fila['destino_iata'],
            'ciudad' => $fila['destino_ciudad'],
            'nombre' => $fila['destino_nombre'],
            'codigo_pais' => $fila['destino_pais']
        ],
        'salida_ts'    => $salidaTs,
        'llegada_ts'   => $llegadaTs,
        // Cadenas de hora local directamente desde BD (sin conversión TZ):
        // el frontend las usa tal cual en lugar de toLocaleTimeString(salida_ts)
        'salida_texto'  => date('h:i a', $salidaTs),   // ej. "08:00 pm"
        'llegada_texto' => date('h:i a', $llegadaTs),  // ej. "12:00 am"
        'progreso' => round($progreso, 4),
        'minutos_transcurridos' => (int)floor(($ahoraTs - $salidaTs) / 60),
        'minutos_restantes' => (int)ceil(($llegadaTs - $ahoraTs) / 60),
        'duracion_minutos' => $duracionMin,
        'distancia_km' => $fila['distance_km'] !== null ? (float)$fila['distance_km'] : null,
        'aeronave' => [
            'matricula'  => $fila['aeronave_matricula'],
            'modelo'     => $fila['aeronave_modelo'],
            'fabricante' => $fila['aeronave_fabricante']
        ]
    ];
}
mysqli_free_result($resultado);
mysqli_stmt_close($stmt);
cerrarConexion();

http_response_code(200);
echo json_encode(['ok' => true, 'ahora_ts' => $ahoraTs, 'data' => $vuelos], JSON_UNESCAPED_UNICODE);
