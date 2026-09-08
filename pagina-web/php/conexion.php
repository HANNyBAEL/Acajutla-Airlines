<?php

$servidor = "mysql-10cc1541-henrymenjivar0311-9c2c.a.aivencloud.com";
$puerto = 12456;
$usuario = "avnadmin";
$password = "AVNS_tFQuowWd5Se38TwUim4";
$baseDatos = "defaultdb";

$conexion = mysqli_init();

mysqli_ssl_set(
    $conexion,
    null,                         // key
    null,                         // certificate
    "C:/Users/lenovo/ca.pem",    // CA
    null,                         // CA path
    null                          // cipher
);

if (!mysqli_real_connect(
    $conexion,
    $servidor,
    $usuario,
    $password,
    $baseDatos,
    $puerto,
    null,
    MYSQLI_CLIENT_SSL
)) {
    die("Error de conexión: " . mysqli_connect_error());
}

mysqli_set_charset($conexion, "utf8mb4");