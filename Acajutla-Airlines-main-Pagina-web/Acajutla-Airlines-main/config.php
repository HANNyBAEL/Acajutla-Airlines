<?php

$ambiente = strtolower(trim((string)(getenv('APP_ENV') ?: getenv('NODE_ENV') ?: 'development')));
$modoDesarrollo = $ambiente !== 'production';
define('MODO_DESARROLLO', $modoDesarrollo);

// En desarrollo local comparte la configuración privada del backend. En
// producción solo se aceptan variables de entorno configuradas por el hosting.
if($modoDesarrollo){
    $envLocal = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . '.env';
    if(is_file($envLocal) && is_readable($envLocal)){
        foreach(file($envLocal, FILE_IGNORE_NEW_LINES) ?: [] as $linea){
            if(strpos($linea, "\0") !== false) continue;
            if(!preg_match('/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/', $linea, $coincidencia)) continue;
            $clave = $coincidencia[1];
            if(getenv($clave) !== false) continue;
            $valor = trim($coincidencia[2]);
            if(strlen($valor) >= 2 && (($valor[0] === '"' && substr($valor, -1) === '"') || ($valor[0] === "'" && substr($valor, -1) === "'"))){
                $valor = substr($valor, 1, -1);
            }
            putenv($clave . '=' . $valor);
            $_ENV[$clave] = $valor;
        }
    }
}

$DB_HOST = getenv('DB_HOST') ?: '';
$DB_PORT = (int)(getenv('DB_PORT') ?: 3306);
$DB_USER = getenv('DB_USER') ?: '';
$DB_PASS = getenv('DB_PASS');
if($DB_PASS === false || $DB_PASS === '') $DB_PASS = getenv('DB_PASSWORD');
$DB_PASS = $DB_PASS === false ? '' : (string)$DB_PASS;
$DB_NAME = getenv('DB_NAME') ?: '';
$DB_CA_CERT = getenv('DB_CA_CERT_PATH') ?: (__DIR__ . '/ca.pem');

function registrarErrorInterno($mensaje)
{
    error_log('[Acajutla Airlines] ' . $mensaje);
}

function obtenerConexionDB()
{
    global $DB_HOST, $DB_PORT, $DB_USER, $DB_PASS, $DB_NAME, $DB_CA_CERT;

    mysqli_report(MYSQLI_REPORT_OFF);

    if($DB_HOST === '' || $DB_USER === '' || $DB_NAME === ''){
        registrarErrorInterno('Falta configurar DB_HOST, DB_USER o DB_NAME en el entorno PHP.');
        return null;
    }

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
