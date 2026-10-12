<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/enviar_comprobante.php
 *
 * Endpoint: POST php/enviar_comprobante.php
 * Content-Type esperado: application/json
 * =====================================================================
 */

date_default_timezone_set('America/El_Salvador');
ini_set('display_errors', '0');
error_reporting(E_ALL);
ob_start();

header('Content-Type: application/json; charset=utf-8');

function responderJson($codigoHttp, $body){
    if(ob_get_level() > 0){ ob_clean(); }
    http_response_code($codigoHttp);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    responderJson(400, ['success' => false, 'message' => 'Método no permitido.']);
}

$rawBody = file_get_contents('php://input');
if($rawBody === false || strlen($rawBody) === 0){
    responderJson(400, ['success' => false, 'message' => 'Cuerpo de la petición vacío.']);
}
if(strlen($rawBody) > 200000){
    responderJson(400, ['success' => false, 'message' => 'Payload demasiado grande.']);
}

$payload = json_decode($rawBody, true);
if(json_last_error() !== JSON_ERROR_NONE || !is_array($payload)){
    responderJson(400, ['success' => false, 'message' => 'JSON inválido.']);
}

function textoSeguro($v, $maxLen = 200){
    if(!is_string($v)) return null;
    $v = trim($v);
    $v = str_replace(["\r", "\n"], ' ', $v);
    if($v === '' || strlen($v) > $maxLen) return null;
    return $v;
}

$pnr = isset($payload['pnr']) ? textoSeguro($payload['pnr'], 20) : null;
if(!$pnr || !preg_match('/^[A-Za-z0-9]{3,20}$/', $pnr)){
    responderJson(400, ['success' => false, 'message' => 'PNR inválido.']);
}

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/correo_service.php';
require_once __DIR__ . '/session_auth.php';
if(!CONEXION_OK){
    responderJson(500, ['success' => false, 'message' => 'No pudimos verificar la reserva. Intenta nuevamente.']);
}
$usuario = usuarioSesionWeb($conexion);
if(!$usuario || $usuario['role'] !== 'customer' || $usuario['customer_id'] === null){
    cerrarConexion();
    responderJson(401, ['success' => false, 'message' => 'Inicia sesión con la cuenta propietaria de la reserva.']);
}

$stmtReserva = mysqli_prepare($conexion,
    "SELECT r.id, r.pnr, r.status, r.estimated_total, r.paid_total,
            c.email, c.first_names, c.last_names
     FROM reservations r
     INNER JOIN customers c ON c.id = r.customer_id AND c.status = 'active'
     WHERE r.pnr = ? AND r.customer_id = ? LIMIT 1"
);
if(!$stmtReserva){
    cerrarConexion();
    responderJson(500, ['success' => false, 'message' => 'No pudimos verificar la reserva. Intenta nuevamente.']);
}
mysqli_stmt_bind_param($stmtReserva, 'si', $pnr, $usuario['customer_id']);
mysqli_stmt_execute($stmtReserva);
$resReserva = mysqli_stmt_get_result($stmtReserva);
$reservaDb = $resReserva ? mysqli_fetch_assoc($resReserva) : null;
if($resReserva) mysqli_free_result($resReserva);
mysqli_stmt_close($stmtReserva);
if(!$reservaDb){
    cerrarConexion();
    responderJson(404, ['success' => false, 'message' => 'No encontramos una reserva tuya con ese código.']);
}
$estadoDb = strtolower((string)$reservaDb['status']);
if(!in_array($estadoDb, ['paid', 'confirmed', 'completed'], true) || (float)$reservaDb['paid_total'] <= 0){
    cerrarConexion();
    responderJson(409, ['success' => false, 'message' => 'La reserva todavía no tiene un pago confirmado.']);
}

$reservationId = (int)$reservaDb['id'];
$stmtConciliacion = mysqli_prepare($conexion,
    "SELECT COALESCE(SUM(CASE
       WHEN type = 'payment' AND status = 'approved' THEN amount
       WHEN type = 'refund' AND status = 'refunded' THEN -amount
       ELSE 0 END), 0) AS neto
     FROM payments WHERE reservation_id = ?"
);
if(!$stmtConciliacion){
    cerrarConexion();
    responderJson(500, ['success' => false, 'message' => 'No pudimos validar el pago. Intenta nuevamente.']);
}
mysqli_stmt_bind_param($stmtConciliacion, 'i', $reservationId);
mysqli_stmt_execute($stmtConciliacion);
$resConciliacion = mysqli_stmt_get_result($stmtConciliacion);
$filaConciliacion = $resConciliacion ? mysqli_fetch_assoc($resConciliacion) : null;
if($resConciliacion) mysqli_free_result($resConciliacion);
mysqli_stmt_close($stmtConciliacion);
$netoAprobado = $filaConciliacion ? (float)$filaConciliacion['neto'] : 0.0;
if(abs($netoAprobado - (float)$reservaDb['paid_total']) > 0.01){
    cerrarConexion();
    responderJson(409, ['success' => false, 'message' => 'El pago requiere conciliación antes de emitir el comprobante.']);
}

$email = strtolower(trim((string)$reservaDb['email']));
$nombreCliente = trim((string)$reservaDb['first_names'] . ' ' . (string)$reservaDb['last_names']);
$total = (float)$reservaDb['paid_total'];
$estadoReserva = 'CONFIRMADA';
$estadoPago = 'APROBADO';
$pagoEstado = $estadoPago;
$pagoMetodo = 'N/D';
$stmtPago = mysqli_prepare($conexion, "SELECT method FROM payments WHERE reservation_id = ? AND type = 'payment' AND status = 'approved' ORDER BY payment_date DESC, id DESC LIMIT 1");
if($stmtPago){
    mysqli_stmt_bind_param($stmtPago, 'i', $reservationId);
    mysqli_stmt_execute($stmtPago);
    $resPago = mysqli_stmt_get_result($stmtPago);
    $filaPago = $resPago ? mysqli_fetch_assoc($resPago) : null;
    if($resPago) mysqli_free_result($resPago);
    if($filaPago){
        $mapaMetodos = ['card' => 'Tarjeta', 'transfer' => 'Transferencia', 'cash' => 'Efectivo', 'paypal' => 'PayPal', 'other' => 'Otro'];
        $pagoMetodo = $mapaMetodos[$filaPago['method']] ?? 'Otro';
    }
    mysqli_stmt_close($stmtPago);
}

$pasajerosDb = [];
$stmtPasajeros = mysqli_prepare($conexion, "SELECT first_names, last_names, document_number, passenger_type FROM passengers WHERE reservation_id = ? ORDER BY id");
if($stmtPasajeros){
    mysqli_stmt_bind_param($stmtPasajeros, 'i', $reservationId);
    mysqli_stmt_execute($stmtPasajeros);
    $resPasajeros = mysqli_stmt_get_result($stmtPasajeros);
    while($resPasajeros && ($fila = mysqli_fetch_assoc($resPasajeros))){
        $pasajerosDb[] = ['nombres' => $fila['first_names'], 'apellidos' => $fila['last_names'], 'documento' => $fila['document_number'], 'tipo' => $fila['passenger_type']];
    }
    if($resPasajeros) mysqli_free_result($resPasajeros);
    mysqli_stmt_close($stmtPasajeros);
}
$segmentosDb = [];
$stmtSegmentos = mysqli_prepare($conexion,
    "SELECT f.id, f.flight_number, f.departure_datetime, ao.iata_code AS origen,
            ad.iata_code AS destino, fs.seat
     FROM flight_segments fs
     INNER JOIN flights f ON f.id = fs.flight_id
     INNER JOIN routes r ON r.id = f.route_id
     INNER JOIN airports ao ON ao.id = r.origin_id
     INNER JOIN airports ad ON ad.id = r.destination_id
     WHERE fs.reservation_id = ? AND fs.status <> 'cancelled'
     ORDER BY f.departure_datetime, fs.id"
);
if($stmtSegmentos){
    mysqli_stmt_bind_param($stmtSegmentos, 'i', $reservationId);
    mysqli_stmt_execute($stmtSegmentos);
    $resSegmentos = mysqli_stmt_get_result($stmtSegmentos);
    while($resSegmentos && ($fila = mysqli_fetch_assoc($resSegmentos))){
        $key = (string)$fila['id'];
        if(!isset($segmentosDb[$key])){
            $segmentosDb[$key] = [
                'numero_vuelo' => $fila['flight_number'], 'origen' => $fila['origen'],
                'destino' => $fila['destino'], 'fecha' => substr((string)$fila['departure_datetime'], 0, 10),
                'asientos' => []
            ];
        }
        if($fila['seat'] !== null) $segmentosDb[$key]['asientos'][] = $fila['seat'];
    }
    if($resSegmentos) mysqli_free_result($resSegmentos);
    mysqli_stmt_close($stmtSegmentos);
}
foreach($segmentosDb as &$segmentoDb){
    $segmentoDb['asiento'] = implode(', ', $segmentoDb['asientos']) ?: '-';
    unset($segmentoDb['asientos']);
}
unset($segmentoDb);
if(!$email || !filter_var($email, FILTER_VALIDATE_EMAIL) || !$pasajerosDb || !$segmentosDb){
    cerrarConexion();
    responderJson(409, ['success' => false, 'message' => 'La reserva no tiene datos suficientes para emitir su comprobante.']);
}

// Solo se usan datos persistidos. Nunca se imprimen montos, estados, nombres,
// pasajeros ni vuelos proporcionados por quien llama al endpoint.
$payload = [
    'pnr' => $pnr, 'email' => $email, 'nombreCliente' => $nombreCliente,
    'total' => $total, 'estado' => $estadoReserva,
    'segmentos' => array_values($segmentosDb), 'pasajeros' => $pasajerosDb,
    'servicios' => [], 'pago' => ['metodo' => $pagoMetodo, 'estado' => $estadoPago]
];

function h($v){
    return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
}

$filasSegmentos = '';
foreach($payload['segmentos'] as $seg){
    if(!is_array($seg)) continue;
    $numeroVuelo = h($seg['numero_vuelo'] ?? '-');
    $origen      = h($seg['origen'] ?? '-');
    $destino     = h($seg['destino'] ?? '-');
    $fecha       = h($seg['fecha'] ?? '-');
    $asiento     = h(($seg['asiento'] ?? '-') ?: '-');
    $filasSegmentos .= '
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">' . $numeroVuelo . '</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">' . $origen . ' &rarr; ' . $destino . '</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">' . $fecha . '</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">' . $asiento . '</td>
        </tr>';
}

$filasPasajeros = '';
$hayBebesCorreo = false;
$mapaTiposCorreo = ['adult' => 'Adulto', 'young' => 'Joven', 'child' => 'Niño'];
foreach($payload['pasajeros'] as $p){
    if(!is_array($p)) continue;
    $nombres   = h($p['nombres'] ?? '-');
    $apellidos = h($p['apellidos'] ?? '-');
    $esBebe = esPasajeroBebe($p);
    if($esBebe) $hayBebesCorreo = true;
    if($esBebe){
        $detalleTipo = ' <span style="color:#b45309;font-size:12px;">· Bebé: viaja en brazos con un adulto, sin asiento asignado</span>';
    } else {
        $tipoRaw = strtolower(trim((string)($p['tipo'] ?? '')));
        $detalleTipo = ($tipoRaw !== '')
            ? ' <span style="color:#889;font-size:12px;">· ' . h($mapaTiposCorreo[$tipoRaw] ?? ucfirst($tipoRaw)) . '</span>'
            : '';
    }
    $filasPasajeros .= '
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">' . $nombres . ' ' . $apellidos . $detalleTipo . '</td>
        </tr>';
}
$notaBebesCorreo = $hayBebesCorreo
    ? '<p style="font-size:12px;color:#b45309;margin:-12px 0 16px 0;">&#128118; Los bebés viajan en brazos acompañados de un adulto y no tienen asiento asignado.</p>'
    : '';

$filasServicios = '';
$tieneServicios = isset($payload['servicios']) && is_array($payload['servicios']) && count($payload['servicios']) > 0;
if($tieneServicios){
    foreach($payload['servicios'] as $srv){
        if(!is_array($srv)) continue;
        $srvNombre   = h($srv['nombre'] ?? 'Servicio');
        $srvPax      = h($srv['pasajeroNombre'] ?? '');
        $srvIncluido = !empty($srv['incluido']);
        $srvNota     = h($srv['nota'] ?? ($srvIncluido ? 'Incluido en tu tarifa' : 'Adicional'));
        $srvPrecio   = $srvIncluido ? '$0.00 (Incluido)' : ('$' . number_format((float)($srv['precio'] ?? 0), 2, '.', ','));

        $filasServicios .= '
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;"><b>' . $srvNombre . '</b>' . ($srvPax !== '' ? ' <span style="color:#556;font-size:12px;">(' . $srvPax . ')</span>' : '') . '</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:' . ($srvIncluido ? '#1c6b3f' : '#556') . ';">' . $srvNota . '</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:bold;color:' . ($srvIncluido ? '#1c6b3f' : '#1a2436') . ';">' . $srvPrecio . '</td>
        </tr>';
    }
}

function _numALetrasGrupo($num){
    $num = (int)$num;
    if($num === 0) return '';
    if($num === 100) return 'cien';

    $unidades19 = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
        'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    $decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    $centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    $c = intdiv($num, 100);
    $resto = $num % 100;
    $partes = [];
    if($c > 0) $partes[] = $centenas[$c];

    if($resto > 0){
        if($resto < 20){
            $partes[] = $unidades19[$resto];
        } elseif($resto < 30){
            $partes[] = ($resto === 20) ? 'veinte' : 'veinti' . $unidades19[$resto - 20];
        } else {
            $d = intdiv($resto, 10);
            $u = $resto % 10;
            $texto = $decenas[$d];
            if($u > 0) $texto .= ' y ' . $unidades19[$u];
            $partes[] = $texto;
        }
    }
    return implode(' ', $partes);
}

function numeroALetrasEntero($n){
    $n = (int)abs($n);
    if($n === 0) return 'cero';

    $millones = intdiv($n, 1000000);
    $resto1 = $n % 1000000;
    $miles = intdiv($resto1, 1000);
    $unidades = $resto1 % 1000;

    $partes = [];
    if($millones > 0){
        $partes[] = ($millones === 1) ? 'un millón' : (_numALetrasGrupo($millones) . ' millones');
    }
    if($miles > 0){
        $partes[] = ($miles === 1) ? 'mil' : (_numALetrasGrupo($miles) . ' mil');
    }
    if($unidades > 0){
        $partes[] = _numALetrasGrupo($unidades);
    }

    $resultado = trim(implode(' ', $partes));

    if(substr($resultado, -9) === 'veintiuno'){
        $resultado = substr($resultado, 0, -9) . 'veintiún';
    } elseif(substr($resultado, -3) === 'uno'){
        $resultado = substr($resultado, 0, -3) . 'un';
    }

    return $resultado;
}

function montoEnLetras($total){
    $centavosTotales = (int)round(((float)$total) * 100);
    $enteros = intdiv($centavosTotales, 100);
    $centavos = $centavosTotales % 100;

    $textoEnteros = numeroALetrasEntero($enteros);
    $textoCentavos = numeroALetrasEntero($centavos);

    $palabraDolar = ($enteros === 1) ? 'dólar' : 'dólares';
    $palabraCentavo = ($centavos === 1) ? 'centavo' : 'centavos';

    return ucfirst($textoEnteros) . ' ' . $palabraDolar . ' con ' . $textoCentavos . ' ' . $palabraCentavo . '.';
}

$totalFormateado = number_format($total, 2, '.', ',');
$totalEnLetras = montoEnLetras($total);

function utf8ALatin1Seguro($texto){
    $texto = (string)$texto;
    if(function_exists('mb_convert_encoding')){
        return mb_convert_encoding($texto, 'Windows-1252', 'UTF-8');
    }
    if(function_exists('iconv')){
        $res = @iconv('UTF-8', 'Windows-1252//TRANSLIT//IGNORE', $texto);
        if($res !== false) return $res;
    }
    $resultado = '';
    $len = strlen($texto);
    for($i = 0; $i < $len; $i++){
        $byte = ord($texto[$i]);
        if($byte < 0x80){
            $resultado .= $texto[$i];
        } elseif(($byte & 0xE0) === 0xC0 && $i + 1 < $len){
            $byte2 = ord($texto[$i + 1]);
            $codepoint = (($byte & 0x1F) << 6) | ($byte2 & 0x3F);
            $resultado .= ($codepoint <= 0xFF) ? chr($codepoint) : '?';
            $i++;
        } else {
            $resultado .= '?';
        }
    }
    return $resultado;
}

function pdfEscaparTexto($texto){
    $texto = (string)$texto;
    $texto = str_replace(["\r", "\n"], ' ', $texto);
    $texto = utf8ALatin1Seguro($texto);
    return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $texto);
}

// Un bebé viaja en brazos con un adulto y no ocupa asiento. El frontend lo
// marca como tipo 'infant' (o requiresSeat=false en versiones previas).
function esPasajeroBebe($p){
    if(!is_array($p)) return false;
    foreach(['tipo', 'type'] as $campo){
        if(isset($p[$campo]) && is_string($p[$campo]) && strtolower(trim($p[$campo])) === 'infant') return true;
    }
    return array_key_exists('requiresSeat', $p) && $p['requiresSeat'] === false;
}

function construirPdfComprobante($datos){
    $anchoPagina = 595.28; $altoPagina = 841.89; // A4
    $margenIzq = 42; $margenDer = 42;
    $altoBanda = 64;
    $margenInferior = 56;
    $colorCorporativo = [0.043, 0.239, 0.388];
    $colorGris = [0.34, 0.38, 0.44];
    $colorNegro = [0.1, 0.12, 0.16];

    $lineas = [];
    $agregar = function($texto, $fuente = 'F1', $tam = 10, $color = null, $espacioAntes = 4, $indent = 0) use (&$lineas, $colorNegro){
        $lineas[] = ['tipo' => 'texto', 'texto' => (string)$texto, 'fuente' => $fuente, 'tam' => $tam,
                      'color' => $color ?? $colorNegro, 'espacioAntes' => $espacioAntes, 'indent' => $indent];
    };
    $separador = function($espacioAntes = 8) use (&$lineas){
        $lineas[] = ['tipo' => 'separador', 'espacioAntes' => $espacioAntes];
    };

    $fechaEmision = date('d/m/Y H:i');

    $agregar('COMPROBANTE DE RESERVA Y BILLETE ELECTRÓNICO', 'F2', 14, $colorCorporativo, 0);
    $agregar('Código de reserva (PNR): ' . ($datos['pnr'] ?? '-'), 'F2', 12, $colorNegro, 6);
    $agregar('Fecha de emisión: ' . $fechaEmision, 'F1', 9, $colorGris, 2);
    $separador(10);

    $agregar('DATOS DEL CLIENTE', 'F2', 11, $colorCorporativo, 0);
    $agregar('Cliente: ' . ($datos['nombreCliente'] ?? '-'), 'F1', 10, $colorNegro, 6);
    $agregar('Correo de contacto: ' . ($datos['email'] ?? '-'), 'F1', 10, $colorNegro, 3);
    $agregar('Estado de la reserva: ' . ($datos['estado'] ?? '-'), 'F1', 10, $colorNegro, 3);
    $separador(10);

    $agregar('ITINERARIO', 'F2', 11, $colorCorporativo, 0);
    $segmentos = is_array($datos['segmentos'] ?? null) ? $datos['segmentos'] : [];
    foreach($segmentos as $seg){
        if(!is_array($seg)) continue;
        $numeroVuelo = (string)($seg['numero_vuelo'] ?? '-');
        $origen      = (string)($seg['origen'] ?? '-');
        $destino     = (string)($seg['destino'] ?? '-');
        $fecha       = (string)($seg['fecha'] ?? '-');
        $agregar('Vuelo ' . $numeroVuelo . '  ·  ' . $origen . ' -> ' . $destino, 'F2', 10.5, $colorNegro, 8);
        $agregar('Fecha: ' . $fecha, 'F1', 9.5, $colorGris, 2, 8);
        if(!empty($seg['fare_class'])){
            $agregar('Clase/tarifa: ' . (string)$seg['fare_class'], 'F1', 9.5, $colorGris, 1, 8);
        }
        if(!empty($seg['asientos']) && is_array($seg['asientos']) && !empty($datos['pasajeros']) && is_array($datos['pasajeros'])){
            foreach($seg['asientos'] as $idx => $asientoPax){
                $pax = $datos['pasajeros'][$idx] ?? null;
                $nombrePax = is_array($pax) ? trim(($pax['nombres'] ?? '') . ' ' . ($pax['apellidos'] ?? '')) : ('Pasajero ' . ($idx + 1));
                $strAsiento = is_scalar($asientoPax) ? (string)$asientoPax : 'Asignado';
                if(is_array($pax) && esPasajeroBebe($pax)){
                    $agregar('- ' . $nombrePax . '  ·  Bebé (INF): viaja en brazos con adulto, sin asiento', 'F1', 9.5, $colorNegro, 1, 14);
                } else {
                    $agregar('- ' . $nombrePax . '  ·  Asiento: ' . ($strAsiento ?: 'No requiere asiento'), 'F1', 9.5, $colorNegro, 1, 14);
                }
            }
        } elseif(!empty($seg['asiento'])){
            $agregar('Asiento: ' . (string)$seg['asiento'], 'F1', 9.5, $colorNegro, 1, 14);
        }
    }
    $separador(10);

    $agregar('PASAJEROS', 'F2', 11, $colorCorporativo, 0);
    $pasajeros = is_array($datos['pasajeros'] ?? null) ? $datos['pasajeros'] : [];
    $etiquetasTipo = ['adult' => 'Adulto', 'young' => 'Joven', 'child' => 'Niño', 'infant' => 'Bebé'];
    $hayBebes = false;
    foreach($pasajeros as $p){
        if(!is_array($p)) continue;
        $esBebe = esPasajeroBebe($p);
        if($esBebe) $hayBebes = true;
        $nombreCompleto = trim(($p['nombres'] ?? '') . ' ' . ($p['apellidos'] ?? ''));
        $linea = $nombreCompleto !== '' ? $nombreCompleto : 'Pasajero';
        $tipoPax = strtolower(trim((string)($p['tipo'] ?? ($p['type'] ?? ''))));
        if($esBebe){
            $linea .= '  ·  Bebé (INF)';
        } elseif($tipoPax !== ''){
            $linea .= '  ·  Tipo: ' . ($etiquetasTipo[$tipoPax] ?? ucfirst($tipoPax));
        }
        if(!empty($p['documento'])) $linea .= '  ·  Documento: ' . (string)$p['documento'];
        if(!empty($p['nacionalidad'])) $linea .= '  ·  Nacionalidad: ' . (string)$p['nacionalidad'];
        $agregar($linea, 'F1', 9.5, $colorNegro, 5);
        if($esBebe){
            $agregar('Viaja en brazos con un adulto acompañante y no tiene asiento asignado.', 'F1', 9, $colorGris, 1, 14);
        }
    }
    if($hayBebes){
        $agregar('IMPORTANTE: los bebés viajan en brazos con un adulto y no tienen asiento asignado.', 'F2', 9.5, [0.70, 0.38, 0.04], 6, 0);
    }
    $separador(10);

    $serviciosPdf = is_array($datos['servicios'] ?? null) ? $datos['servicios'] : [];
    if(count($serviciosPdf) > 0){
        $agregar('SERVICIOS CONTRATADOS E INCLUIDOS', 'F2', 11, $colorCorporativo, 0);
        foreach($serviciosPdf as $srv){
            if(!is_array($srv)) continue;
            $srvNom = (string)($srv['nombre'] ?? 'Servicio');
            $srvPax = (string)($srv['pasajeroNombre'] ?? '');
            $srvInc = !empty($srv['incluido']);
            $srvNot = (string)($srv['nota'] ?? ($srvInc ? 'Incluido en tarifa' : 'Adicional'));
            $srvPre = $srvInc ? 'Incluido ($0.00)' : ('$' . number_format((float)($srv['precio'] ?? 0), 2, '.', ',') . ' USD');
            $lineaSrv = '- ' . $srvNom . ($srvPax !== '' ? ' (' . $srvPax . ')' : '') . ' · ' . $srvNot . ' · ' . $srvPre;
            $agregar($lineaSrv, 'F1', 9.5, $colorNegro, 4, 8);
        }
        $separador(10);
    }

    $agregar('PAGO', 'F2', 11, $colorCorporativo, 0);
    $pagoMetodoPdf = is_array($datos['pago'] ?? null) ? ($datos['pago']['metodo'] ?? 'N/D') : 'N/D';
    $pagoEstadoPdf = is_array($datos['pago'] ?? null) ? ($datos['pago']['estado'] ?? 'N/D') : 'N/D';
    $agregar('Método: ' . $pagoMetodoPdf, 'F1', 10, $colorNegro, 6);
    $agregar('Estado del pago: ' . $pagoEstadoPdf, 'F1', 10, $colorNegro, 3);
    $separador(10);

    $agregar('TOTAL', 'F2', 11, $colorCorporativo, 0);
    $agregar('Total: $' . ($datos['totalFormateado'] ?? '0.00') . ' USD', 'F2', 12, $colorNegro, 6);
    if(!empty($datos['totalEnLetras'])){
        $agregar('Total en letras: ' . $datos['totalEnLetras'], 'F1', 9.5, $colorGris, 3);
    }

    $paginas = [];
    $paginaActual = [];
    $y = $altoPagina - $altoBanda - 34;
    foreach($lineas as $l){
        $alturaLinea = ($l['tipo'] === 'separador') ? $l['espacioAntes'] + 6 : ($l['tam'] * 1.35 + $l['espacioAntes']);
        if($y - $alturaLinea < $margenInferior){
            $paginas[] = $paginaActual;
            $paginaActual = [];
            $y = $altoPagina - $altoBanda - 34;
        }
        $y -= $alturaLinea;
        $l['y'] = $y;
        $paginaActual[] = $l;
    }
    if(!empty($paginaActual)) $paginas[] = $paginaActual;
    if(empty($paginas)) $paginas[] = [];

    $streamsPaginas = [];
    foreach($paginas as $indicePagina => $lineasPagina){
        $stream = '';
        $stream .= sprintf("%.3F %.3F %.3F rg\n0 %.2F %.2F %.2F re f\n",
            $colorCorporativo[0], $colorCorporativo[1], $colorCorporativo[2],
            $altoPagina - $altoBanda, $anchoPagina, $altoBanda);
        $stream .= "1 1 1 rg\nBT /F2 16 Tf 1 0 0 1 " . $margenIzq . " " . ($altoPagina - 38) . " Tm (ACAJUTLA AIRLINES) Tj ET\n";
        $stream .= "BT /F1 9 Tf 1 0 0 1 " . $margenIzq . " " . ($altoPagina - 54) . " Tm (Comprobante de reserva electronico) Tj ET\n";

        foreach($lineasPagina as $l){
            if($l['tipo'] === 'separador'){
                $yLinea = $l['y'] + 3;
                $stream .= sprintf("%.3F %.3F %.3F RG\n%.2F %.2F m %.2F %.2F l S\n",
                    0.82, 0.85, 0.88, $margenIzq, $yLinea, $anchoPagina - $margenDer, $yLinea);
                continue;
            }
            $x = $margenIzq + $l['indent'];
            $stream .= sprintf("%.3F %.3F %.3F rg\nBT /%s %.1F Tf 1 0 0 1 %.2F %.2F Tm (%s) Tj ET\n",
                $l['color'][0], $l['color'][1], $l['color'][2], $l['fuente'], $l['tam'], $x, $l['y'], pdfEscaparTexto($l['texto']));
        }
        $streamsPaginas[] = $stream;
    }

    $numPaginas = count($streamsPaginas);
    $objetos = [];
    $idPagesKids = [];
    $primerObjetoPagina = 5;
    for($i = 0; $i < $numPaginas; $i++){
        $idPagina = $primerObjetoPagina + ($i * 2);
        $idContenido = $idPagina + 1;
        $idPagesKids[] = $idPagina;
    }
    $kidsRefs = implode(' ', array_map(function($id){ return $id . ' 0 R'; }, $idPagesKids));

    $objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    $objetos[2] = "<< /Type /Pages /Kids [$kidsRefs] /Count $numPaginas >>";
    $objetos[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    $objetos[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    for($i = 0; $i < $numPaginas; $i++){
        $idPagina = $primerObjetoPagina + ($i * 2);
        $idContenido = $idPagina + 1;
        $objetos[$idPagina] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " . $anchoPagina . " " . $altoPagina . "] "
            . "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " . $idContenido . " 0 R >>";
        $stream = $streamsPaginas[$i];
        $objetos[$idContenido] = "STREAM::" . $stream;
    }

    $pdf = "%PDF-1.4\n";
    $offsets = [0 => 0];
    ksort($objetos);
    foreach($objetos as $id => $cuerpo){
        $offsets[$id] = strlen($pdf);
        if(strpos($cuerpo, 'STREAM::') === 0){
            $contenidoStream = substr($cuerpo, strlen('STREAM::'));
            $pdf .= $id . " 0 obj\n<< /Length " . strlen($contenidoStream) . " >>\nstream\n" . $contenidoStream . "endstream\nendobj\n";
        } else {
            $pdf .= $id . " 0 obj\n" . $cuerpo . "\nendobj\n";
        }
    }

    $totalObjetos = max(array_keys($objetos)) + 1;
    $offsetXref = strlen($pdf);
    $pdf .= "xref\n0 " . $totalObjetos . "\n";
    $pdf .= "0000000000 65535 f \n";
    for($id = 1; $id < $totalObjetos; $id++){
        if(isset($offsets[$id])){
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$id]);
        } else {
            $pdf .= "0000000000 00000 f \n";
        }
    }
    $pdf .= "trailer\n<< /Size " . $totalObjetos . " /Root 1 0 R >>\nstartxref\n" . $offsetXref . "\n%%EOF";

    return $pdf;
}

$htmlCorreo = '<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,Helvetica,sans-serif;color:#1a2436;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0b3d63;padding:20px 24px;">
          <span style="color:#ffffff;font-size:20px;font-weight:bold;">ACAJUTLA AIRLINES</span>
        </td></tr>
        <tr><td style="padding:24px;">
          <h2 style="margin:0 0 4px 0;color:#0b3d63;">Comprobante de reserva</h2>
          <p style="margin:0 0 16px 0;color:#556;">Código de reserva (PNR): <b>' . h($pnr) . '</b></p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="padding:4px 0;color:#556;">Cliente:</td><td style="padding:4px 0;"><b>' . h($nombreCliente) . '</b></td></tr>
            <tr><td style="padding:4px 0;color:#556;">Correo:</td><td style="padding:4px 0;">' . h($email) . '</td></tr>
            <tr><td style="padding:4px 0;color:#556;">Estado de la reserva:</td><td style="padding:4px 0;">' . h($estadoReserva) . '</td></tr>
          </table>

          <h3 style="margin:0 0 8px 0;color:#0b3d63;">Vuelos</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-collapse:collapse;">
            <tr style="background:#eef3f8;">
              <td style="padding:8px;font-size:12px;color:#556;">Vuelo</td>
              <td style="padding:8px;font-size:12px;color:#556;">Ruta</td>
              <td style="padding:8px;font-size:12px;color:#556;">Fecha</td>
              <td style="padding:8px;font-size:12px;color:#556;">Asiento</td>
            </tr>
            ' . $filasSegmentos . '
          </table>

          <h3 style="margin:0 0 8px 0;color:#0b3d63;">Pasajeros</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-collapse:collapse;">
            ' . $filasPasajeros . '
          </table>
          ' . $notaBebesCorreo . '
          ' . ($tieneServicios ? '
          <h3 style="margin:0 0 8px 0;color:#0b3d63;">Servicios contratados e incluidos</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-collapse:collapse;">
            <tr style="background:#eef3f8;">
              <td style="padding:8px;font-size:12px;color:#556;">Servicio / Pasajero</td>
              <td style="padding:8px;font-size:12px;color:#556;">Detalle</td>
              <td style="padding:8px;font-size:12px;color:#556;">Precio</td>
            </tr>
            ' . $filasServicios . '
          </table>' : '') . '

          <h3 style="margin:0 0 8px 0;color:#0b3d63;">Pago</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            <tr><td style="padding:4px 0;color:#556;">Método:</td><td style="padding:4px 0;">' . h($pagoMetodo) . '</td></tr>
            <tr><td style="padding:4px 0;color:#556;">Estado del pago:</td><td style="padding:4px 0;">' . h($pagoEstado) . '</td></tr>
            <tr><td style="padding:4px 0;color:#556;font-weight:bold;">Total:</td><td style="padding:4px 0;font-weight:bold;">$' . h($totalFormateado) . '</td></tr>
            <tr><td style="padding:4px 0;color:#556;">Total en letras:</td><td style="padding:4px 0;">' . h($totalEnLetras) . '</td></tr>
          </table>

          <p style="font-size:12px;color:#889;margin-top:24px;">Este es un comprobante generado automáticamente. Conserva este correo como referencia de tu reserva.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>';

$asunto = 'Acajutla Airlines - Comprobante de reserva ' . $pnr;

require_once __DIR__ . '/conexion.php';

if(!CONEXION_OK){
    responderJson(500, ['success' => false, 'message' => 'No pudimos enviar el comprobante. Intenta nuevamente.']);
}

$stmtPrevio = mysqli_prepare($conexion,
    "SELECT status FROM email_outbox
     WHERE template = 'booking_confirmation' AND ref_type = 'reservation'
       AND ref_id = ? AND LOWER(to_email) = ? AND status IN ('pending','sent')
     ORDER BY id DESC LIMIT 1"
);
if(!$stmtPrevio){
    cerrarConexion();
    responderJson(500, ['success' => false, 'message' => 'No pudimos verificar si ya se envió el comprobante.']);
}
mysqli_stmt_bind_param($stmtPrevio, 'ss', $pnr, $email);
mysqli_stmt_execute($stmtPrevio);
$resPrevio = mysqli_stmt_get_result($stmtPrevio);
$filaPrevia = $resPrevio ? mysqli_fetch_assoc($resPrevio) : null;
if($resPrevio) mysqli_free_result($resPrevio);
mysqli_stmt_close($stmtPrevio);
if($filaPrevia){
    cerrarConexion();
    if($filaPrevia['status'] === 'sent'){
        responderJson(200, ['success' => true, 'alreadySent' => true, 'message' => 'El comprobante ya fue enviado.']);
    }
    responderJson(409, ['success' => false, 'message' => 'El comprobante ya tiene un envío en proceso.']);
}

$sqlInsert = "INSERT INTO email_outbox (template, to_email, subject, html, ref_type, ref_id, status)
              VALUES ('booking_confirmation', ?, ?, ?, 'reservation', ?, 'pending')";
$stmtInsert = mysqli_prepare($conexion, $sqlInsert);
if(!$stmtInsert){
    error_log('[Acajutla Airlines] Error al preparar INSERT en email_outbox: ' . mysqli_error($conexion));
    cerrarConexion();
    responderJson(500, ['success' => false, 'message' => 'No pudimos enviar el comprobante. Intenta nuevamente.']);
}
mysqli_stmt_bind_param($stmtInsert, 'ssss', $email, $asunto, $htmlCorreo, $pnr);
if(!mysqli_stmt_execute($stmtInsert)){
    error_log('[Acajutla Airlines] Error al insertar en email_outbox: ' . mysqli_stmt_error($stmtInsert));
    mysqli_stmt_close($stmtInsert);
    cerrarConexion();
    responderJson(500, ['success' => false, 'message' => 'No pudimos enviar el comprobante. Intenta nuevamente.']);
}
$emailOutboxId = mysqli_insert_id($conexion);
mysqli_stmt_close($stmtInsert);

function actualizarEstadoEnvio($conexion, $id, $status, $errorMsg = null, $providerMessageId = null){
    if($status === 'sent'){
        $sql = "UPDATE email_outbox SET status='sent', sent_at=NOW(), error_msg=NULL, brevo_message_id=? WHERE id=?";
        $stmt = mysqli_prepare($conexion, $sql);
        if($stmt){
            mysqli_stmt_bind_param($stmt, 'si', $providerMessageId, $id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
    } else {
        $sql = "UPDATE email_outbox SET status='failed', error_msg=? WHERE id=?";
        $stmt = mysqli_prepare($conexion, $sql);
        if($stmt){
            $errorMsgRecortado = $errorMsg !== null ? substr((string)$errorMsg, 0, 1000) : 'Error desconocido.';
            mysqli_stmt_bind_param($stmt, 'si', $errorMsgRecortado, $id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
    }
}

try{
    $adjuntoPdfBase64 = null;
    $nombreArchivoPdf = null;
    try {
        $datosPdf = [
            'pnr'             => $pnr,
            'email'           => $email,
            'nombreCliente'   => $nombreCliente,
            'estado'          => $estadoReserva,
            'total'           => $total,
            'totalFormateado' => $totalFormateado,
            'totalEnLetras'   => $totalEnLetras,
            'segmentos'       => $payload['segmentos'] ?? [],
            'pasajeros'       => $payload['pasajeros'] ?? [],
            'servicios'       => $payload['servicios'] ?? [],
            'pago'            => ['metodo' => $pagoMetodo, 'estado' => $pagoEstado],
        ];
        $bytesPdf = construirPdfComprobante($datosPdf);
        if(!empty($bytesPdf)){
            $adjuntoPdfBase64 = base64_encode($bytesPdf);
            $nombreArchivoPdf = 'Acajutla_Airlines_Reserva_' . preg_replace('/[^A-Za-z0-9]/', '', $pnr) . '.pdf';
        }
    } catch(Throwable $ePdf){
        error_log('[Acajutla Airlines] Advertencia: No se pudo generar PDF adjunto (' . $ePdf->getMessage() . '), enviando solo HTML.');
        $adjuntoPdfBase64 = null;
        $nombreArchivoPdf = null;
    }

    $resultadoEnvio = enviarCorreoTransaccional($email, $asunto, $htmlCorreo, $adjuntoPdfBase64, $nombreArchivoPdf);
    actualizarEstadoEnvio($conexion, $emailOutboxId, 'sent', null, $resultadoEnvio['id'] ?? null);
    cerrarConexion();
    responderJson(200, ['success' => true, 'message' => 'Comprobante enviado correctamente.']);
} catch(Throwable $e){
    error_log('[Acajutla Airlines] Error de envío transaccional: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    actualizarEstadoEnvio($conexion, $emailOutboxId, 'failed', $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    cerrarConexion();
    responderJson(500, ['success' => false, 'message' => 'No pudimos enviar el comprobante. Intenta nuevamente.']);
}
