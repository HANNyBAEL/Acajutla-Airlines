<?php
/** Envío de correo transaccional usando la configuración compartida del backend. */

function correoPostJson($url, array $headers, $body, $timeout = 30){
    $opciones = [
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => $body,
            'timeout' => $timeout,
            'ignore_errors' => true
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]
    ];
    $contexto = stream_context_create($opciones);
    $respuesta = @file_get_contents($url, false, $contexto);
    $codigo = 0;
    if(isset($http_response_header) && is_array($http_response_header)){
        foreach($http_response_header as $cabecera){
            if(preg_match('#^HTTP/\S+\s+(\d{3})#', $cabecera, $m)) $codigo = (int)$m[1];
        }
    }
    if($respuesta === false || $codigo < 200 || $codigo >= 300){
        throw new RuntimeException('El proveedor de correo no aceptó el mensaje (HTTP ' . $codigo . ').');
    }
    $datos = json_decode((string)$respuesta, true);
    return ['codigo' => $codigo, 'datos' => is_array($datos) ? $datos : []];
}

function enviarCorreoTransaccional($destinatario, $asunto, $html, $adjuntoBase64 = null, $nombreArchivo = null){
    $apiBrevo = getenv('BREVO_API_KEY');
    $remitenteBrevo = getenv('BREVO_FROM_EMAIL');
    if($apiBrevo && $remitenteBrevo){
        $cuerpo = [
            'sender' => ['name' => getenv('BREVO_FROM_NAME') ?: 'Acajutla Airlines', 'email' => $remitenteBrevo],
            'to' => [['email' => $destinatario]],
            'subject' => $asunto,
            'htmlContent' => $html
        ];
        if($adjuntoBase64 && $nombreArchivo){
            $cuerpo['attachment'] = [['name' => $nombreArchivo, 'content' => $adjuntoBase64]];
        }
        $respuesta = correoPostJson(
            'https://api.brevo.com/v3/smtp/email',
            ['Content-Type: application/json', 'api-key: ' . $apiBrevo],
            json_encode($cuerpo, JSON_UNESCAPED_UNICODE),
            60
        );
        $id = $respuesta['datos']['messageId'] ?? null;
        if(!is_string($id) || $id === '') throw new RuntimeException('Brevo aceptó el envío sin devolver un identificador de mensaje.');
        return ['proveedor' => 'brevo', 'id' => $id];
    }

    $apiNylas = getenv('NYLAS_API_KEY');
    $grantNylas = getenv('NYLAS_GRANT_ID');
    if($apiNylas && $grantNylas){
        $cuerpo = [
            'subject' => $asunto,
            'to' => [['email' => $destinatario]],
            'body' => $html,
            'is_plaintext' => false
        ];
        if($adjuntoBase64 && $nombreArchivo){
            $cuerpo['attachments'] = [[
                'content_type' => 'application/pdf',
                'filename' => $nombreArchivo,
                'content' => $adjuntoBase64
            ]];
        }
        $respuesta = correoPostJson(
            'https://api.us.nylas.com/v3/grants/' . rawurlencode($grantNylas) . '/messages/send',
            ['Content-Type: application/json', 'Authorization: Bearer ' . $apiNylas],
            json_encode($cuerpo, JSON_UNESCAPED_UNICODE),
            60
        );
        $id = $respuesta['datos']['data']['id'] ?? null;
        if(!is_string($id) || $id === '') throw new RuntimeException('Nylas aceptó el envío sin devolver un identificador de mensaje.');
        return ['proveedor' => 'nylas', 'id' => $id];
    }

    throw new RuntimeException('Configura BREVO_API_KEY y BREVO_FROM_EMAIL o las credenciales de Nylas.');
}
