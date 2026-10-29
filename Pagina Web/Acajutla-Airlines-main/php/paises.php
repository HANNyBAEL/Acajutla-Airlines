<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/paises.php
 *
 * Endpoint: GET php/paises.php?q=texto_busqueda
 *
 * Búsqueda REAL (no mock) de países desde la tabla countries, para el
 * autocompletado de nacionalidad en el formulario de pasajeros.
 *
 * Estructura real confirmada de countries:
 *   id INT PK, code CHAR(2) UNIQUE, name VARCHAR(100), active TINYINT(1),
 *   created_at DATETIME
 *
 * Busca por code O name (coincidencia parcial, insensible a mayúsculas),
 * solo countries.active = 1. Devuelve ÚNICAMENTE code y name — nada más,
 * para no exponer información innecesaria.
 *
 * Sin parámetro "q" (o vacío): devuelve los primeros países activos
 * ordenados por nombre, útil para mostrar opciones al enfocar el campo.
 *
 * Respuesta:
 *   { "ok": true, "data": [ {"code":"SV","name":"El Salvador"}, ... ] }
 *   { "ok": false, "error": "..." }
 * =====================================================================
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

function responderError($mensaje, $codigo){
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if(!CONEXION_OK){
    responderError('No se pudo conectar con la base de datos.', 500);
}

$q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
if(strlen($q) > 100){
    cerrarConexion();
    responderError('Búsqueda inválida.', 400);
}

if($q === ''){
    $sql = "SELECT code, name FROM countries WHERE active = 1 ORDER BY name ASC LIMIT 20";
    $stmt = mysqli_prepare($conexion, $sql);
} else {
    $sql = "SELECT code, name FROM countries
            WHERE active = 1 AND (code LIKE ? OR name LIKE ?)
            ORDER BY (code = ?) DESC, name ASC
            LIMIT 20";
    $stmt = mysqli_prepare($conexion, $sql);
}

if(!$stmt){
    error_log('[Acajutla Airlines] Error al preparar búsqueda de países: ' . mysqli_error($conexion));
    cerrarConexion();
    responderError('No se pudo consultar países.', 500);
}

if($q !== ''){
    $like = '%' . $q . '%';
    $codigoExacto = strtoupper($q);
    mysqli_stmt_bind_param($stmt, 'sss', $like, $like, $codigoExacto);
}

if(!mysqli_stmt_execute($stmt)){
    error_log('[Acajutla Airlines] Error al ejecutar búsqueda de países: ' . mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudo consultar países.', 500);
}

$resultado = mysqli_stmt_get_result($stmt);
if($resultado === false){
    mysqli_stmt_close($stmt);
    cerrarConexion();
    responderError('No se pudo consultar países.', 500);
}

$paises = [];
while($fila = mysqli_fetch_assoc($resultado)){
    $paises[] = ['code' => $fila['code'], 'name' => $fila['name']];
}
mysqli_free_result($resultado);
mysqli_stmt_close($stmt);
cerrarConexion();

http_response_code(200);
echo json_encode(['ok' => true, 'data' => $paises], JSON_UNESCAPED_UNICODE);
