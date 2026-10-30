<?php

$localConfigPath = __DIR__ . '/config.local.php';
if (is_file($localConfigPath)) {
    require_once $localConfigPath;
}

$envConfig = static function ($name, $fallback = '') {
    $value = getenv($name);
    return ($value === false || $value === '') ? $fallback : $value;
};

define('MODO_DESARROLLO', strtolower((string)$envConfig('APP_ENV', 'development')) !== 'production');

$DB_HOST = (string)$envConfig('DB_HOST', $DB_HOST ?? '');
$DB_PORT = (int)$envConfig('DB_PORT', $DB_PORT ?? 3306);
$DB_USER = (string)$envConfig('DB_USER', $DB_USER ?? '');
$DB_PASS = (string)$envConfig('DB_PASS', $DB_PASS ?? '');
$DB_NAME = (string)$envConfig('DB_NAME', $DB_NAME ?? '');
$DB_CA_CERT = (string)$envConfig('DB_CA_CERT', $DB_CA_CERT ?? (__DIR__ . '/ca.pem'));

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
        registrarErrorInterno('No se encontró el certificado CA de MySQL.');
        return null;
    }

    mysqli_ssl_set($conexion, null, null, $DB_CA_CERT, null, null);

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
        registrarErrorInterno('Fallo de conexión: ' . mysqli_connect_error());
        return null;
    }

    mysqli_set_charset($conexion, 'utf8mb4');

    return $conexion;
}