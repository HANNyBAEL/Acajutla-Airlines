<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/auth_session.php';

function responderSesion($codigo, $body){
    http_response_code($codigo);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if($_SERVER['REQUEST_METHOD'] !== 'GET') responderSesion(405, ['ok' => false, 'error' => 'Método no permitido.']);
if(!CONEXION_OK) responderSesion(500, ['ok' => false, 'error' => 'No se pudo conectar con la base de datos.']);
$cliente = obtenerClienteWebAutenticado($conexion);
cerrarConexion();
responderSesion(200, ['ok' => true, 'autenticado' => (bool)$cliente, 'cliente' => $cliente]);
