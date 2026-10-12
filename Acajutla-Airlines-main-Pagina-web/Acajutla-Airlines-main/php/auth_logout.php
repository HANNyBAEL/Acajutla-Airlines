<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/session_auth.php';

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    http_response_code(405);
    echo json_encode(['ok' => false, 'mensaje' => 'Método no permitido.'], JSON_UNESCAPED_UNICODE);
    exit;
}

destruirSesionWeb();
echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
