<?php

require_once "conexion.php";

header("Content-Type: application/json; charset=utf-8");

$sql = "
    SELECT
        id,
        codigo_iata,
        codigo_icao,
        nombre,
        ciudad,
        codigo_pais,
        zona_horaria
    FROM aeropuertos
    ORDER BY ciudad ASC
";

$resultado = mysqli_query($conexion, $sql);

if (!$resultado) {
    http_response_code(500);

    echo json_encode([
        "error" => "Error en la consulta",
        "detalle" => mysqli_error($conexion)
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

$aeropuertos = [];

while ($aeropuerto = mysqli_fetch_assoc($resultado)) {
    $aeropuertos[] = $aeropuerto;
}

echo json_encode($aeropuertos, JSON_UNESCAPED_UNICODE);

mysqli_free_result($resultado);