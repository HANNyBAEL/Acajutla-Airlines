<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/calcular_impuestos.php
 *
 * Endpoint intermediario: POST php/calcular_impuestos.php
 * Content-Type esperado: application/json
 * 
 * Este archivo sirve de puente entre la página web (tu proyecto) 
 * y el Sistema Base en Node.js (el proyecto de tu compañero).
 * La idea es que la web le envíe el subtotal y los detalles del vuelo a este archivo,
 * y este consulte al servidor Node.js para aplicar las 'tax_rules' oficiales.
 * =====================================================================
 */
header('Content-Type: application/json; charset=utf-8');

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Método no permitido.']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if(json_last_error() !== JSON_ERROR_NONE || !is_array($payload)){
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido.']);
    exit;
}

$subtotal = isset($payload['subtotal']) ? (float)$payload['subtotal'] : 0.0;
$flightIds = isset($payload['flight_ids']) && is_array($payload['flight_ids']) ? $payload['flight_ids'] : [];

// =======================================================================
// LLAMADA AL SISTEMA BASE (NODE.JS) PARA CALCULAR IMPUESTOS
// =======================================================================
// Reemplazar la URL cuando el endpoint de Node.js esté listo.
$nodeApiUrl = "http://localhost:3000/api/taxes/calculate"; 

$ch = curl_init($nodeApiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'subtotal' => $subtotal,
    'flight_ids' => $flightIds
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

$resTaxes = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if($httpCode >= 200 && $httpCode < 300) {
    // Si el servidor de Node responde correctamente, devolvemos los datos
    $datosImpuestos = json_decode($resTaxes, true);
    echo json_encode(['ok' => true, 'data' => $datosImpuestos]);
} else {
    // Fallback de desarrollo por si el servidor Node.js no está levantado
    // Muestra cómo debería ser la estructura para que la web pueda seguir funcionando provisionalmente
    $dummyTaxes = [
        'subtotal' => $subtotal,
        'tax_total' => $subtotal * 0.13, // 13% IVA genérico de ejemplo
        'grand_total' => $subtotal * 1.13,
        'breakdown' => [
            ['name' => 'IVA (13%)', 'amount' => $subtotal * 0.13]
        ]
    ];
    echo json_encode(['ok' => true, 'fallback' => true, 'data' => $dummyTaxes]);
}
