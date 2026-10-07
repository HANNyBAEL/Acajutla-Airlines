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

const NYLAS_API_BASE = 'https://api.us.nylas.com/v3';

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

$email = isset($payload['email']) ? trim((string)$payload['email']) : '';
$email = str_replace(["\r", "\n"], '', $email);
if($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150){
    responderJson(400, ['success' => false, 'message' => 'Correo electrónico inválido.']);
}

$nombreCliente = textoSeguro($payload['nombreCliente'] ?? null, 150);
if(!$nombreCliente){
    responderJson(400, ['success' => false, 'message' => 'Nombre de cliente inválido.']);
}

if(!isset($payload['total']) || !is_numeric($payload['total'])){
    responderJson(400, ['success' => false, 'message' => 'Total inválido.']);
}
$total = (float)$payload['total'];

$estadoReserva = textoSeguro($payload['estado'] ?? 'CONFIRMADA', 30) ?: 'CONFIRMADA';

if(!isset($payload['segmentos']) || !is_array($payload['segmentos']) || count($payload['segmentos']) === 0){
    responderJson(400, ['success' => false, 'message' => 'Debe incluir al menos un segmento de vuelo.']);
}
if(count($payload['segmentos']) > 10){
    responderJson(400, ['success' => false, 'message' => 'Demasiados segmentos de vuelo.']);
}

if(!isset($payload['pasajeros']) || !is_array($payload['pasajeros']) || count($payload['pasajeros']) === 0){
    responderJson(400, ['success' => false, 'message' => 'Debe incluir al menos un pasajero.']);
}
if(count($payload['pasajeros']) > 20){
    responderJson(400, ['success' => false, 'message' => 'Demasiados pasajeros.']);
}

if(!isset($payload['pago']) || !is_array($payload['pago'])){
    responderJson(400, ['success' => false, 'message' => 'Datos de pago inválidos.']);
}

$pagoMetodo = textoSeguro($payload['pago']['metodo'] ?? null, 40) ?: 'N/D';
$pagoEstado = textoSeguro($payload['pago']['estado'] ?? null, 40) ?: 'N/D';

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

function actualizarEstadoEnvio($conexion, $id, $status, $errorMsg = null, $nylasMessageId = null){
    if($status === 'sent'){
        $sql = "UPDATE email_outbox SET status='sent', sent_at=NOW(), error_msg=NULL, brevo_message_id=? WHERE id=?";
        $stmt = mysqli_prepare($conexion, $sql);
        if($stmt){
            mysqli_stmt_bind_param($stmt, 'si', $nylasMessageId, $id);
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

function postJsonHttps($url, array $headers, $cuerpoJson, $timeoutSegundos = 15){
    if(function_exists('curl_init')){
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $cuerpoJson,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeoutSegundos,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $cuerpoRespuesta = curl_exec($ch);
        if($cuerpoRespuesta === false){
            $error = curl_error($ch);
            curl_close($ch);
            throw new Exception('Fallo de conexión (cURL) hacia el servicio de correo: ' . $error);
        }
        $codigoHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['codigo' => (int)$codigoHttp, 'cuerpo' => $cuerpoRespuesta];
    }

    $opciones = [
        'http' => [
            'method'  => 'POST',
            'header'  => implode("\r\n", $headers),
            'content' => $cuerpoJson,
            'timeout' => $timeoutSegundos,
            'ignore_errors' => true,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ];
    $contexto = stream_context_create($opciones);
    $cuerpoRespuesta = @file_get_contents($url, false, $contexto);

    if($cuerpoRespuesta === false){
        throw new Exception('Fallo de conexión (stream HTTPS) hacia el servicio de correo.');
    }

    $codigoHttp = 0;
    if(isset($http_response_header) && is_array($http_response_header)){
        foreach($http_response_header as $cabecera){
            if(preg_match('#^HTTP/\S+\s+(\d{3})#', $cabecera, $m)){
                $codigoHttp = (int)$m[1];
            }
        }
    }
    return ['codigo' => $codigoHttp, 'cuerpo' => $cuerpoRespuesta];
}

function enviarCorreoNylas($apiKey, $grantId, $destinatario, $asunto, $htmlBody, $adjuntoPdfBase64 = null, $nombreArchivoPdf = null){
    $cuerpo = [
        'subject' => $asunto,
        'to'      => [['email' => $destinatario]],
        'body'    => $htmlBody,
        'is_plaintext' => false,
    ];

    if($adjuntoPdfBase64 !== null && $nombreArchivoPdf !== null){
        $cuerpo['attachments'] = [[
            'content_type' => 'application/pdf',
            'filename'     => $nombreArchivoPdf,
            'content'      => $adjuntoPdfBase64,
        ]];
    }

    $cuerpoJson = json_encode($cuerpo, JSON_UNESCAPED_UNICODE);

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ];

    $url = NYLAS_API_BASE . '/grants/' . rawurlencode($grantId) . '/messages/send';

    $respuesta = postJsonHttps($url, $headers, $cuerpoJson, 160);
    $codigoHttp = $respuesta['codigo'];
    $cuerpoRespuesta = $respuesta['cuerpo'];

    $datos = json_decode((string)$cuerpoRespuesta, true);

    if($codigoHttp < 200 || $codigoHttp >= 300){
        throw new Exception('Nylas respondió HTTP ' . $codigoHttp . ': ' . substr((string)$cuerpoRespuesta, 0, 500));
    }

    $datosEnvio = (is_array($datos) && isset($datos['data']) && is_array($datos['data'])) ? $datos['data'] : null;
    $mensajeId = ($datosEnvio && isset($datosEnvio['id']) && is_string($datosEnvio['id']) && $datosEnvio['id'] !== '')
        ? $datosEnvio['id']
        : null;

    if($mensajeId === null){
        throw new Exception('Nylas respondió HTTP ' . $codigoHttp . ' pero sin un id de mensaje válido: ' . substr((string)$cuerpoRespuesta, 0, 500));
    }

    return $mensajeId;
}

$nylasApiKey = getenv('NYLAS_API_KEY');
$nylasGrantId = getenv('NYLAS_GRANT_ID');

if(!$nylasApiKey || !$nylasGrantId){
    actualizarEstadoEnvio($conexion, $emailOutboxId, 'failed', 'NYLAS_API_KEY / NYLAS_GRANT_ID no configurados correctamente en el entorno del servidor.');
    cerrarConexion();
    responderJson(500, ['success' => false, 'message' => 'No pudimos enviar el comprobante. Intenta nuevamente.']);
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

    $nylasMessageId = enviarCorreoNylas($nylasApiKey, $nylasGrantId, $email, $asunto, $htmlCorreo, $adjuntoPdfBase64, $nombreArchivoPdf);
    actualizarEstadoEnvio($conexion, $emailOutboxId, 'sent', null, $nylasMessageId);
    cerrarConexion();
    responderJson(200, ['success' => true, 'message' => 'Comprobante enviado correctamente.']);
} catch(Throwable $e){
    error_log('[Acajutla Airlines] Error de envío vía Nylas Email API: ' . $e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    actualizarEstadoEnvio($conexion, $emailOutboxId, 'failed', $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    cerrarConexion();
    responderJson(500, ['success' => false, 'message' => 'No pudimos enviar el comprobante. Intenta nuevamente.']);
}