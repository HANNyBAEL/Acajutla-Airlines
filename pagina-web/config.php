<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — config.php
 * Único lugar del proyecto donde debe existir la contraseña de MySQL.
 * NUNCA se incluye ni se referencia desde index.html ni desde JavaScript.
 * =====================================================================
 */

// Modo desarrollo: en local (XAMPP) puede quedar en true para ver mensajes
// técnicos en el log de PHP. En un entorno real de producción debe ser false.
define('MODO_DESARROLLO', true);

// -----------------------------------------------------------------------
// DATOS DE CONEXIÓN A AIVEN (MySQL)
// -----------------------------------------------------------------------
$DB_HOST = 'mysql-10cc1541-henrymenjivar0311-9c2c.a.aivencloud.com';
$DB_PORT = 12456;
$DB_USER = 'avnadmin';

// ⚠️ COLOCA AQUÍ TU CONTRASEÑA DE AIVEN MANUALMENTE. NUNCA la subas a git.
$DB_PASS = 'AVNS_tFQuowWd5Se38TwUim4';

$DB_NAME = 'defaultdb';

// Ruta al certificado CA de Aiven. Debe existir en la misma carpeta del proyecto.
$DB_CA_CERT = __DIR__ . '/ca.pem';

/**
 * Abre y devuelve una conexión mysqli usando SSL contra Aiven.
 * Si algo falla, devuelve null (nunca expone la contraseña ni detalles sensibles).
 *
 * @return mysqli|null
 */
function obtenerConexionDB(){
    global $DB_HOST, $DB_PORT, $DB_USER, $DB_PASS, $DB_NAME, $DB_CA_CERT;

    // No exponer errores nativos de mysqli directamente al cliente.
    mysqli_report(MYSQLI_REPORT_OFF);

    $conexion = mysqli_init();
    if(!$conexion){
        registrarErrorInterno('No se pudo inicializar mysqli.');
        return null;
    }

    if(!file_exists($DB_CA_CERT)){
        registrarErrorInterno('No se encontró el certificado CA (ca.pem) en: ' . $DB_CA_CERT);
        return null;
    }

    // Configurar SSL con el certificado CA de Aiven. NUNCA desactivar la verificación.
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

    if(!$conectado){
        // El detalle técnico (sin password) solo se registra en el log del servidor,
        // nunca se envía al navegador.
        registrarErrorInterno('Fallo de conexión a Aiven: ' . mysqli_connect_error());
        return null;
    }

    mysqli_set_charset($conexion, 'utf8mb4');
    return $conexion;
}

/**
 * Registra un error técnico en el log de PHP (nunca en la respuesta JSON al cliente).
 * En MODO_DESARROLLO además se puede ver en error_log de Apache/XAMPP.
 */
function registrarErrorInterno($mensaje){
    error_log('[Acajutla Airlines] ' . $mensaje);
}
