<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — conexion.php
 * Capa reutilizable de conexión a MySQL (Aiven).
 *
 * Este archivo NO define credenciales propias. Reutiliza exclusivamente
 * la función obtenerConexionDB() ya definida en config.php (que ya tiene
 * configurados $DB_HOST, $DB_PORT, $DB_USER, $DB_PASS, $DB_NAME,
 * $DB_CA_CERT y la conexión SSL con ca.pem).
 *
 * USO DESDE OTROS ARCHIVOS (aeropuertos.php, vuelos.php, pasajeros.php,
 * reservas.php, pagos.php, etc.):
 *
 *   require_once __DIR__ . '/conexion.php';
 *   // A partir de aquí ya existe la variable $conexion (mysqli) lista para usar:
 *   $stmt = $conexion->prepare("SELECT ...");
 *
 * Si obtenerConexionDB() no pudo establecer la conexión, $conexion queda
 * en null y CONEXION_OK en false, para que el archivo que incluya este
 * módulo pueda decidir qué hacer (por ejemplo, responder un JSON de error)
 * sin que conexion.php imponga ese comportamiento.
 * =====================================================================
 * NOTA DE UBICACIÓN: este archivo vive en php/conexion.php (movido desde la
 * raíz en la Fase 1 de separación). Por eso incluye config.php con una ruta
 * relativa hacia el nivel superior (__DIR__ . '/../config.php'), ya que
 * config.php permanece en la raíz del proyecto sin moverse.
 */

// Ruta segura y absoluta hacia config.php (mismo directorio que este archivo).
require_once __DIR__ . '/../config.php';

// Intenta obtener la conexión reutilizando la función ya existente en config.php.
// No se declaran ni se repiten aquí $DB_HOST/$DB_PORT/$DB_USER/$DB_PASS/$DB_NAME.
$conexion = obtenerConexionDB();

// Bandera simple que otros archivos pueden consultar sin tener que volver
// a verificar el tipo de $conexion.
define('CONEXION_OK', $conexion instanceof mysqli);

/**
 * Cierra $conexion de forma segura. Los archivos que incluyan conexion.php
 * pueden llamar a esto al finalizar, aunque no es obligatorio (PHP libera
 * la conexión automáticamente al terminar el script).
 */
function cerrarConexion(){
    global $conexion;
    if($conexion instanceof mysqli){
        mysqli_close($conexion);
    }
}

/**
 * Si conexion.php se abre DIRECTAMENTE en el navegador (no vía require_once
 * desde otro script), responde un JSON simple confirmando si la conexión
 * a Aiven funciona o no. Nunca expone host, usuario, contraseña ni errores
 * internos de MySQL.
 */
$esAccesoDirecto = isset($_SERVER['SCRIPT_FILENAME'])
    && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__;

if($esAccesoDirecto){
    header('Content-Type: application/json; charset=utf-8');

    if(CONEXION_OK){
        http_response_code(200);
        echo json_encode([
            'ok' => true,
            'mensaje' => 'Conexión a la base de datos establecida correctamente.'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'No se pudo conectar con la base de datos.'
        ], JSON_UNESCAPED_UNICODE);
    }

    cerrarConexion();
    exit;
}
