<?php

require_once "conexion.php";

header("Content-Type: application/json; charset=utf-8");

// Recibir parámetros desde JavaScript
$origen = $_GET['origen'] ?? '';
$destino = $_GET['destino'] ?? '';
$fecha = $_GET['fecha'] ?? '';

// Validar que vengan los datos necesarios
if ($origen === '' || $destino === '' || $fecha === '') {

    http_response_code(400);

    echo json_encode([
        "error" => "Faltan parámetros",
        "origen" => $origen,
        "destino" => $destino,
        "fecha" => $fecha
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// Consulta de vuelos
$sql = "
    SELECT
        v.id,
        v.numero_vuelo,

        ao.codigo_iata AS origen,
        ao.nombre AS aeropuerto_origen,

        ad.codigo_iata AS destino,
        ad.nombre AS aeropuerto_destino,

        v.salida_programada,
        v.llegada_programada,
        v.estado,
        v.puerta,
        v.terminal

    FROM vuelos v

    INNER JOIN rutas r
        ON v.ruta_id = r.id

    INNER JOIN aeropuertos ao
        ON r.aeropuerto_origen_id = ao.id

    INNER JOIN aeropuertos ad
        ON r.aeropuerto_destino_id = ad.id

    WHERE ao.codigo_iata = ?
      AND ad.codigo_iata = ?
      AND DATE(v.salida_programada) = ?

    ORDER BY v.salida_programada ASC
";

// Preparar consulta
$stmt = mysqli_prepare($conexion, $sql);

if (!$stmt) {

    http_response_code(500);

    echo json_encode([
        "error" => "No se pudo preparar la consulta",
        "detalle" => mysqli_error($conexion)
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// Enviar parámetros
mysqli_stmt_bind_param(
    $stmt,
    "sss",
    $origen,
    $destino,
    $fecha
);

// Ejecutar
if (!mysqli_stmt_execute($stmt)) {

    http_response_code(500);

    echo json_encode([
        "error" => "Error ejecutando la consulta",
        "detalle" => mysqli_stmt_error($stmt)
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// Obtener resultados
$resultado = mysqli_stmt_get_result($stmt);

$vuelos = [];

while ($vuelo = mysqli_fetch_assoc($resultado)) {
    $vuelos[] = $vuelo;
}

// Devolver JSON
echo json_encode(
    $vuelos,
    JSON_UNESCAPED_UNICODE
);

mysqli_free_result($resultado);
mysqli_stmt_close($stmt);