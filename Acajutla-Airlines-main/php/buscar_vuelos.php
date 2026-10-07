<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/buscar_vuelos.php
 *
 * Endpoint independiente de búsqueda de vuelos (Fase 1 de separación).
 * Reemplaza, para el nuevo index.php, al antiguo api.php?action=buscar_vuelos.
 *
 * api.php se mantiene intacto en la raíz del proyecto (no se elimina ni
 * se modifica); este archivo es la versión dedicada y separada que usa
 * el frontend a partir de ahora, ya adaptada al esquema real confirmado:
 *
 *   flights: id, route_id, aircraft_id, flight_number, departure_datetime,
 *            arrival_datetime, status, base_price, gate, terminal,
 *            observations, created_at, updated_at
 *   routes: id, origin_id, destination_id, distance_km,
 *           estimated_duration_minutes, route_code, active, created_at
 *   airports: id, iata_code, icao_code, name, city, country, country_code,
 *             timezone, active, created_at
 *   aircraft: id, registration, serial_number, type_id, status,
 *             manufacture_year, last_maintenance_date, next_maintenance_date,
 *             total_flight_hours, active, created_at
 *   aircraft_types: id, model, manufacturer, total_capacity,
 *                   seat_configuration, range_km, active, created_at
 *
 * Tarifas por clase reales (fare_classes + flight_fares): cada vuelo
 * incluye, cuando existen filas en flight_fares, la propiedad
 * "tarifas": [{"clase":"ECONOMICA","precio":219.00}, ...]. Si un vuelo
 * no tiene filas en flight_fares, no se agrega esa propiedad y el
 * frontend sigue usando flights.base_price como respaldo (comportamiento
 * ya previsto en Util.obtenerPrecioTarifa, sin cambios en el frontend).
 *
 * Reglas aplicadas (según lo indicado):
 *   - routes.active = 1 (ruta activa)
 *   - flights.status <> 'cancelled' (vuelos cancelados excluidos)
 *
 * Parámetros GET: origen (id de airports), destino (id de airports),
 * fecha (YYYY-MM-DD).
 *
 * Respuesta:
 *   { "ok": true,  "data": [...] }
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

$origenId  = isset($_GET['origen'])  ? $_GET['origen']  : '';
$destinoId = isset($_GET['destino']) ? $_GET['destino'] : '';
$fecha     = isset($_GET['fecha'])   ? $_GET['fecha']   : '';

if(!ctype_digit((string)$origenId) || !ctype_digit((string)$destinoId)){
    cerrarConexion();
    responderError('Origen y destino deben ser identificadores de aeropuerto válidos.', 400);
}
if(!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)){
    cerrarConexion();
    responderError('La fecha debe tener el formato YYYY-MM-DD.', 400);
}

$sql = "SELECT
            f.id,
            f.flight_number,
            f.departure_datetime,
            f.arrival_datetime,
            f.status,
            f.base_price,
            f.gate,
            f.terminal,

            r.distance_km,
            r.estimated_duration_minutes,

            ao.id           AS origen_id,
            ao.iata_code    AS origen_iata,
            ao.icao_code    AS origen_icao,
            ao.name         AS origen_nombre,
            ao.city         AS origen_ciudad,
            ao.country_code AS origen_codigo_pais,
            ao.timezone     AS origen_zona_horaria,

            ad.id           AS destino_id,
            ad.iata_code    AS destino_iata,
            ad.icao_code    AS destino_icao,
            ad.name         AS destino_nombre,
            ad.city         AS destino_ciudad,
            ad.country_code AS destino_codigo_pais,
            ad.timezone     AS destino_zona_horaria,

            ac.id            AS aircraft_id_real,
            ac.registration,
            ac.serial_number,
            ac.status        AS aircraft_status,

            at.model,
            at.manufacturer,
            at.total_capacity,
            at.seat_configuration,
            at.range_km

        FROM flights f
        INNER JOIN routes r ON f.route_id = r.id AND r.active = 1
        INNER JOIN airports ao ON r.origin_id = ao.id
        INNER JOIN airports ad ON r.destination_id = ad.id
        LEFT JOIN aircraft ac ON f.aircraft_id = ac.id
        LEFT JOIN aircraft_types at ON ac.type_id = at.id
        WHERE ao.id = ?
          AND ad.id = ?
          AND DATE(f.departure_datetime) = ?
          AND f.status NOT IN ('cancelled', 'completed', 'in_progress')
          AND f.departure_datetime > CONVERT_TZ(NOW(), '+00:00', '-06:00')
        ORDER BY f.departure_datetime ASC";

$stmt = mysqli_prepare($conexion, $sql);
if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar consulta de vuelos: ' . mysqli_error($conexion));
    cerrarConexion();
    responderError('No se pudo consultar la información solicitada.', 500);
}

$origenIdInt = (int)$origenId;
$destinoIdInt = (int)$destinoId;
mysqli_stmt_bind_param($stmt, 'iis', $origenIdInt, $destinoIdInt, $fecha);

if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al ejecutar consulta de vuelos: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudo consultar la información solicitada.', 500);
}

$resultado = mysqli_stmt_get_result($stmt);
if($resultado === false){
    error_log('[Acajutla Airlines] Error al obtener resultado de vuelos: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudo obtener el resultado de la búsqueda de vuelos.', 500);
}

$vuelos = [];
while($fila = mysqli_fetch_assoc($resultado)){

    // La aeronave es opcional (LEFT JOIN): si flights.aircraft_id no tiene
    // relación válida, se entrega null de forma segura, sin romper la respuesta.
    $aeronave = null;
    if($fila['aircraft_id_real'] !== null){
        $configAsientos = null;
        if($fila['seat_configuration'] !== null){
            $decodificado = json_decode($fila['seat_configuration'], true);
            $configAsientos = (json_last_error() === JSON_ERROR_NONE) ? $decodificado : null;
        }
        $aeronave = [
            'id'                     => (int)$fila['aircraft_id_real'],
            'matricula'              => $fila['registration'],
            'numero_serie'           => $fila['serial_number'],
            'estado'                 => $fila['aircraft_status'],
            'fabricante'             => $fila['manufacturer'],
            'modelo'                 => $fila['model'],
            'capacidad_total'        => $fila['total_capacity'] !== null ? (int)$fila['total_capacity'] : null,
            'configuracion_asientos' => $configAsientos,
            'alcance_km'             => $fila['range_km'] !== null ? (int)$fila['range_km'] : null
        ];
    }

    $vuelos[] = [
        'id'                 => (int)$fila['id'],
        'numero_vuelo'       => $fila['flight_number'],
        'estado'             => $fila['status'],

        'salida_programada'  => $fila['departure_datetime'],
        'llegada_programada' => $fila['arrival_datetime'],
        'puerta'             => $fila['gate'],
        'terminal'           => $fila['terminal'],

        // Único precio real confirmado antes de reservar (no existe una tabla
        // de tarifas por clase): flights.base_price. No se inventa nada más.
        'base_price'         => $fila['base_price'] !== null ? (float)$fila['base_price'] : null,

        'distancia_km'              => $fila['distance_km'] !== null ? (int)$fila['distance_km'] : null,
        'duracion_estimada_minutos' => $fila['estimated_duration_minutes'] !== null ? (int)$fila['estimated_duration_minutes'] : null,

        'origen' => [
            'id'           => (int)$fila['origen_id'],
            'codigo_iata'  => $fila['origen_iata'],
            'codigo_icao'  => $fila['origen_icao'],
            'nombre'       => $fila['origen_nombre'],
            'ciudad'       => $fila['origen_ciudad'],
            'codigo_pais'  => $fila['origen_codigo_pais'],
            'zona_horaria' => $fila['origen_zona_horaria']
        ],
        'destino' => [
            'id'           => (int)$fila['destino_id'],
            'codigo_iata'  => $fila['destino_iata'],
            'codigo_icao'  => $fila['destino_icao'],
            'nombre'       => $fila['destino_nombre'],
            'ciudad'       => $fila['destino_ciudad'],
            'codigo_pais'  => $fila['destino_codigo_pais'],
            'zona_horaria' => $fila['destino_zona_horaria']
        ],

        'aeronave' => $aeronave
    ];
}

mysqli_free_result($resultado);
mysqli_stmt_close($stmt);

// -------------------------------------------------------------------
// Tarifas reales por clase (flight_fares + fare_classes).
// Consulta separada (no se mezcla con el SELECT anterior para no
// multiplicar filas por vuelo). Si un vuelo no tiene filas en
// flight_fares, simplemente no se le agrega la propiedad 'tarifas' y
// el frontend (Util.obtenerPrecioTarifa) sigue usando base_price como
// respaldo, tal como ya estaba previsto.
// -------------------------------------------------------------------
$idsVuelos = array_column($vuelos, 'id');
$tarifasPorVuelo = [];

if(!empty($idsVuelos)){
    $placeholders = implode(',', array_fill(0, count($idsVuelos), '?'));
    $sqlTarifas = "SELECT ff.flight_id, fc.code, ff.price
                    FROM flight_fares ff
                    INNER JOIN fare_classes fc ON fc.id = ff.fare_class_id
                    WHERE fc.active = 1
                      AND ff.active = 1
                      AND ff.flight_id IN ($placeholders)";

    $stmtTarifas = mysqli_prepare($conexion, $sqlTarifas);
    if(!$stmtTarifas){
        error_log('[Acajutla Airlines] Error al preparar consulta de tarifas: ' . mysqli_error($conexion));
    } else {
        $tipos = str_repeat('i', count($idsVuelos));
        $paramsBind = [$stmtTarifas, $tipos];
        foreach($idsVuelos as $key => $valorId){
            $paramsBind[] = &$idsVuelos[$key];
        }
        call_user_func_array('mysqli_stmt_bind_param', $paramsBind);

        if(!mysqli_stmt_execute($stmtTarifas)){
            error_log('[Acajutla Airlines] Error al ejecutar consulta de tarifas: ' . mysqli_stmt_error($stmtTarifas));
        } else {
            $resultadoTarifas = mysqli_stmt_get_result($stmtTarifas);
            if($resultadoTarifas === false){
                error_log('[Acajutla Airlines] Error al obtener resultado de tarifas: ' . mysqli_stmt_error($stmtTarifas));
            } else {
                while($filaTarifa = mysqli_fetch_assoc($resultadoTarifas)){
                    $idVueloTarifa = (int)$filaTarifa['flight_id'];
                    if(!isset($tarifasPorVuelo[$idVueloTarifa])){
                        $tarifasPorVuelo[$idVueloTarifa] = [];
                    }
                    $tarifasPorVuelo[$idVueloTarifa][] = [
                        'clase'  => $filaTarifa['code'],
                        'precio' => (float)$filaTarifa['price']
                    ];
                }
                mysqli_free_result($resultadoTarifas);
            }
        }
        mysqli_stmt_close($stmtTarifas);
    }
}

foreach($vuelos as &$vuelo){
    if(isset($tarifasPorVuelo[$vuelo['id']])){
        $vuelo['tarifas'] = $tarifasPorVuelo[$vuelo['id']];
    }
}
unset($vuelo);

cerrarConexion();

http_response_code(200);
echo json_encode([
    'ok' => true,
    'data' => $vuelos
], JSON_UNESCAPED_UNICODE);