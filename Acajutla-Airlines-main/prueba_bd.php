<?php

require_once "php/conexion.php";

$sql = "SELECT id, codigo_iata, codigo_icao, nombre, ciudad 
        FROM aeropuertos";

$resultado = mysqli_query($conexion, $sql);

if (!$resultado) {
    die("Error en la consulta: " . mysqli_error($conexion));
}

echo "<h1>Aeropuertos desde Aiven</h1>";

while ($aeropuerto = mysqli_fetch_assoc($resultado)) {
    echo "<p>";
    echo $aeropuerto["codigo_iata"] . " - ";
    echo $aeropuerto["nombre"] . " - ";
    echo $aeropuerto["ciudad"];
    echo "</p>";
}

mysqli_free_result($resultado);