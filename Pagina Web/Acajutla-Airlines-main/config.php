<?php

define('MODO_DESARROLLO', true);

$DB_HOST = getenv('DB_HOST') ?: 'mysql-10cc1541-henrymenjivar0311-9c2c.a.aivencloud.com';
$DB_PORT = (int)(getenv('DB_PORT') ?: 12456);
$DB_USER = getenv('DB_USER') ?: 'avnadmin';
$DB_PASS = getenv('DB_PASS') ?: '';
$DB_NAME = getenv('DB_NAME') ?: 'defaultdb';

$DB_CA_CERT = __DIR__ . '/ca.pem';

function registrarErrorInterno($mensaje)
{
    error_log('[Acajutla Airlines] ' . $mensaje);
}

function obtenerConexionDB()
{
    global $DB_HOST, $DB_PORT, $DB_USER, $DB_PASS, $DB_NAME, $DB_CA_CERT;

    mysqli_report(MYSQLI_REPORT_OFF);

    $conexion = mysqli_init();

    if (!$conexion) {
        registrarErrorInterno('No se pudo inicializar mysqli.');
        return null;
    }

    if (!file_exists($DB_CA_CERT)) {
        registrarErrorInterno('No se encontró ca.pem.');
        return null;
    }

    mysqli_ssl_set(
        $conexion,
        null,
        null,
        $DB_CA_CERT,
        null,
        null
    );

    $conectado = @mysqli_real_connect(
        $conexion,
        $DB_HOST,
        $DB_USER,
        $DB_PASS,
        $DB_NAME,
        $DB_PORT,
        null,
        MYSQLI_CLIENT_SSL
    );

    if (!$conectado) {
        registrarErrorInterno(
            'Fallo de conexión: ' . mysqli_connect_error()
        );
        return null;
    }

    mysqli_set_charset($conexion, 'utf8mb4');

    return $conexion;
}