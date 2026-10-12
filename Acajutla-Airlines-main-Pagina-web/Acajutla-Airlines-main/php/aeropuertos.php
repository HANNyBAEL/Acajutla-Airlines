<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/aeropuertos.php
 *
 * Endpoint independiente de aeropuertos (Fase 1 de separación).
 * Reemplaza, para el nuevo index.php, al antiguo api.php?action=aeropuertos.
 *
 * api.php se mantiene intacto en la raíz del proyecto (no se elimina ni
 * se modifica) por si algo más todavía depende de él; este archivo es
 * la versión dedicada y separada que usa el frontend a partir de ahora.
 *
 * Reutiliza la conexión ya existente vía php/conexion.php (que a su vez
 * reutiliza obtenerConexionDB() de config.php). No declara ni duplica
 * credenciales.
 *
 * Tabla real utilizada: airports
 *   id, iata_code, icao_code, name, city, country, country_code,
 *   timezone, active, created_at
 *
 * Respuesta:
 *   { "ok": true,  "data": [...] }
 *   { "ok": false, "error": "..." }
 * =====================================================================
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

if(!CONEXION_OK){
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'No se pudo conectar con la base de datos.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "SELECT
            id,
            iata_code    AS codigo_iata,
            icao_code    AS codigo_icao,
            name         AS nombre,
            city         AS ciudad,
            country_code AS codigo_pais,
            timezone     AS zona_horaria,
            active       AS activo
        FROM airports
        WHERE active = 1
        ORDER BY city ASC, name ASC";

$resultado = mysqli_query($conexion, $sql);

if(!$resultado){
    error_log('[Acajutla Airlines] Error en consulta de aeropuertos: ' . mysqli_error($conexion));
    cerrarConexion();
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'No se pudo consultar la información solicitada.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$aeropuertos = [];
while($fila = mysqli_fetch_assoc($resultado)){
    $aeropuertos[] = [
        'id'            => (int)$fila['id'],
        'codigo_iata'   => $fila['codigo_iata'],
        'codigo_icao'   => $fila['codigo_icao'],
        'nombre'        => $fila['nombre'],
        'ciudad'        => $fila['ciudad'],
        'codigo_pais'   => $fila['codigo_pais'],
        'zona_horaria'  => $fila['zona_horaria'],
        'activo'        => (int)$fila['activo']
    ];
}

mysqli_free_result($resultado);
cerrarConexion();

http_response_code(200);
echo json_encode([
    'ok' => true,
    'data' => $aeropuertos
], JSON_UNESCAPED_UNICODE);
