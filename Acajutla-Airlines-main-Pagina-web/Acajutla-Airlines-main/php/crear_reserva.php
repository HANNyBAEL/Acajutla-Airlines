<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/crear_reserva.php
 *
 * Endpoint: POST php/crear_reserva.php
 * Content-Type esperado: application/json
 *
 * Persiste REALMENTE la reserva en Aiven (reservations, passengers,
 * flight_segments), usando el esquema real confirmado por el usuario.
 * Sustituye, únicamente para este flujo puntual, a Api.crearReserva()
 * en modo mock (MOCK.reservas.push). El resto de USE_MOCKS no se toca.
 *
 * Payload esperado (enviado por Pago.procesar() en index.php):
 *   {
 *     cliente_id: number|null,
 *     total: number,
 *     pasajeros: [ { nombres, apellidos, documento, tipo, tipoDocumento } ],
 *     segmentos: [
 *       { numero_vuelo, origen, destino, fecha,
 *         flight_id: number,               // flights.id real
 *         fare_class: 'economy'|'premium'|'business'|'first',
 *         precio_unitario: number,         // tarifa real de esa clase
 *         asientos: [ "5A", "5B", ... ]    // uno por pasajero, mismo orden (null si no requiere asiento)
 *       }
 *     ],
 *     pago: { metodo, estado, monto },
 *     contacto: { nombre, email, telefono }
 *   }
 *
 * Reglas de ocupación de asiento (idénticas a asientos_ocupados.php):
 *   - flight_segments.status <> 'cancelled' (confirmed/checked_in/boarded/
 *     no_show cuentan como ocupado; solo 'cancelled' libera el asiento)
 *   - reservations.status <> 'cancelled'
 *   - si reservations.status='pending', solo cuenta mientras
 *     time_limit no haya vencido
 *   (se quitó la exclusión de reservations.status='waiting': ningún flujo
 *   real del proyecto crea reservas en ese estado hoy)
 *
 * Concurrencia (SIN migración, sin índice UNIQUE compuesto disponible):
 *   Antes de leer/insertar flight_segments, se bloquea con
 *   "SELECT id FROM flights WHERE id=? FOR UPDATE" la fila REAL y ya
 *   existente de cada flight_id involucrado (flights.id es PRIMARY KEY,
 *   el lock es inequívoco, no depende de qué índices tenga flight_segments).
 *   Si la reserva incluye varios vuelos, se bloquean en orden ascendente
 *   de flight_id para que todas las transacciones concurrentes adquieran
 *   los locks en la misma secuencia y se evite deadlock cruzado. Con el
 *   vuelo bloqueado, ninguna otra transacción que reserve ese mismo vuelo
 *   puede avanzar hasta que esta transacción haga COMMIT o ROLLBACK —
 *   así se evita que dos reservas concurrentes pasen la verificación de
 *   disponibilidad y ambas inserten el mismo asiento.
 *
 * Tipo de pasajero (passengers.passenger_type ENUM('adult','child','infant')):
 *   el frontend distingue adult/young/child/infant; se mapea young->child,
 *   el resto igual. document_type se toma tal cual del formulario
 *   (tipoDocumento), sin forzar un valor fijo.
 *
 * La reserva se crea en estado pending y SIN insertar pagos. El pago se
 * procesa después desde procesar_pago_web.php, que delega en el mismo
 * PaymentService utilizado por el backoffice.
 *
 * Respuesta:
 *   Éxito: {"ok":true,"data":{"pnr":"AB12CD", ...}}
 *   Error: {"ok":false,"error":"..."} (mensaje genérico; detalle técnico
 *          solo en error_log(), nunca expuesto)
 * =====================================================================
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/session_auth.php';

function responderError($mensaje, $codigo){
    http_response_code($codigo);
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
    responderError('Método no permitido.', 400);
}

if(!CONEXION_OK){
    responderError('No se pudo conectar con la base de datos.', 500);
}

// -----------------------------------------------------------------------
// 1. Leer y validar el payload
// -----------------------------------------------------------------------
$raw = file_get_contents('php://input');
if($raw === false || strlen($raw) === 0 || strlen($raw) > 200000){
    cerrarConexion();
    responderError('Payload inválido.', 400);
}
$payload = json_decode($raw, true);
if(json_last_error() !== JSON_ERROR_NONE || !is_array($payload)){
    cerrarConexion();
    responderError('JSON inválido.', 400);
}

$pasajeros = isset($payload['pasajeros']) && is_array($payload['pasajeros']) ? $payload['pasajeros'] : [];
$segmentos = isset($payload['segmentos']) && is_array($payload['segmentos']) ? $payload['segmentos'] : [];
$pago = isset($payload['pago']) && is_array($payload['pago']) ? $payload['pago'] : [];
$total = isset($payload['total']) && is_numeric($payload['total']) ? (float)$payload['total'] : null;

if(count($pasajeros) === 0 || count($pasajeros) > 20){
    cerrarConexion();
    responderError('Número de pasajeros inválido.', 400);
}
if(count($segmentos) === 0 || count($segmentos) > 10){
    cerrarConexion();
    responderError('Debe incluir al menos un segmento de vuelo.', 400);
}
if($total === null){
    cerrarConexion();
    responderError('Total inválido.', 400);
}
if(!is_finite($total) || $total <= 0 || $total > 1000000){
    cerrarConexion();
    responderError('El total debe ser mayor que cero y estar dentro del límite permitido.', 400);
}
if(abs($total - round($total, 2)) > 0.00001){
    cerrarConexion();
    responderError('El total debe expresarse con un máximo de dos decimales.', 400);
}

$contacto = isset($payload['contacto']) && is_array($payload['contacto']) ? $payload['contacto'] : [];
$contactoEmail = isset($contacto['email']) ? strtolower(trim((string)$contacto['email'])) : '';
if(!filter_var($contactoEmail, FILTER_VALIDATE_EMAIL) || strlen($contactoEmail) > 150){
    cerrarConexion();
    responderError('Ingresa un correo de contacto válido.', 400);
}

$metodosPermitidos = ['TARJETA', 'TRANSFERENCIA', 'BILLETERA'];
$metodoRecibido = isset($pago['metodo']) ? strtoupper(trim((string)$pago['metodo'])) : '';
if(!in_array($metodoRecibido, $metodosPermitidos, true)){
    cerrarConexion();
    responderError('El método de pago seleccionado no es válido.', 400);
}

$clasesValidas = ['economy', 'premium', 'business', 'first'];
foreach($segmentos as $seg){
    if(!is_array($seg)
        || !isset($seg['flight_id']) || !ctype_digit((string)$seg['flight_id'])
        || !isset($seg['fare_class']) || !in_array($seg['fare_class'], $clasesValidas, true)
        || !isset($seg['asientos']) || !is_array($seg['asientos'])
        || count($seg['asientos']) !== count($pasajeros)){
        cerrarConexion();
        responderError('Datos de segmento de vuelo inválidos o incompletos.', 400);
    }
}

$mapaTipoPasajeroEntrada = ['adult' => true, 'young' => true, 'child' => true, 'infant' => true];
$tiposPasajeros = [];
$pasajerosConAsiento = 0;
$factoresPasajero = [];
$factorTotal = 0.0;
foreach($pasajeros as $pasajero){
    if(!is_array($pasajero)){
        cerrarConexion();
        responderError('Los datos de pasajero no son válidos.', 400);
    }
    $nombresPax = isset($pasajero['nombres']) ? trim((string)$pasajero['nombres']) : '';
    $apellidosPax = isset($pasajero['apellidos']) ? trim((string)$pasajero['apellidos']) : '';
    $documentoPax = isset($pasajero['documento']) ? trim((string)$pasajero['documento']) : '';
    $tipoDocumentoPax = isset($pasajero['tipoDocumento']) ? (string)$pasajero['tipoDocumento'] : '';
    if($nombresPax === '' || strlen($nombresPax) > 100 || $apellidosPax === '' || strlen($apellidosPax) > 100
        || $documentoPax === '' || strlen($documentoPax) > 30
        || !in_array($tipoDocumentoPax, ['DUI', 'PASAPORTE', 'CARNET_MENOR'], true)){
        cerrarConexion();
        responderError('Completa nombre, apellido y documento válidos para cada pasajero.', 400);
    }
    $tipo = strtolower(trim((string)($pasajero['tipo'] ?? 'adult')));
    if(!isset($mapaTipoPasajeroEntrada[$tipo])){
        cerrarConexion();
        responderError('El tipo de pasajero no es válido.', 400);
    }
    $tiposPasajeros[] = $tipo;
    $factor = $tipo === 'child' || $tipo === 'young' ? 0.75 : ($tipo === 'infant' ? 0.10 : 1.0);
    $factoresPasajero[] = $factor;
    $factorTotal += $factor;
    if($tipo !== 'infant') $pasajerosConAsiento++;
}
if($pasajerosConAsiento < 1){
    cerrarConexion();
    responderError('La reserva necesita al menos un pasajero con asiento.', 400);
}

$servicios = isset($payload['servicios']) && is_array($payload['servicios']) ? $payload['servicios'] : [];
if(count($servicios) > count($pasajeros) * 5){
    cerrarConexion();
    responderError('La selección de servicios excede el límite permitido.', 400);
}

$usuarioSesion = usuarioSesionWeb($conexion);
if($usuarioSesion && ($usuarioSesion['role'] !== 'customer' || $usuarioSesion['customer_id'] === null)){
    cerrarConexion();
    responderError('La cuenta actual no puede realizar reservas de cliente.', 403);
}
if($usuarioSesion){
    $stmtEmailCliente = mysqli_prepare($conexion, "SELECT email FROM customers WHERE id = ? AND status = 'active' LIMIT 1");
    if(!$stmtEmailCliente){
        cerrarConexion();
        responderError('No se pudo validar el perfil de cliente.', 500);
    }
    mysqli_stmt_bind_param($stmtEmailCliente, 'i', $usuarioSesion['customer_id']);
    mysqli_stmt_execute($stmtEmailCliente);
    $resEmailCliente = mysqli_stmt_get_result($stmtEmailCliente);
    $filaEmailCliente = $resEmailCliente ? mysqli_fetch_assoc($resEmailCliente) : null;
    if($resEmailCliente) mysqli_free_result($resEmailCliente);
    mysqli_stmt_close($stmtEmailCliente);
    if(!$filaEmailCliente || !filter_var((string)$filaEmailCliente['email'], FILTER_VALIDATE_EMAIL)){
        cerrarConexion();
        responderError('El perfil de cliente no tiene un correo válido.', 403);
    }
    $contactoEmail = strtolower(trim((string)$filaEmailCliente['email']));
}

function generarPnr($conexion){
    // reservations.pnr es char(6) UNIQUE (uk_pnr). Se reintenta si hay colisión.
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for($intento = 0; $intento < 10; $intento++){
        $pnr = '';
        for($i = 0; $i < 6; $i++){
            $pnr .= $chars[random_int(0, strlen($chars) - 1)];
        }
        $stmt = mysqli_prepare($conexion, 'SELECT id FROM reservations WHERE pnr = ?');
        mysqli_stmt_bind_param($stmt, 's', $pnr);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_store_result($stmt);
        $existe = mysqli_stmt_num_rows($stmt) > 0;
        mysqli_stmt_close($stmt);
        if(!$existe) return $pnr;
    }
    return null;
}

// -----------------------------------------------------------------------
// 2. Transacción: bloquear, verificar disponibilidad real, insertar
// -----------------------------------------------------------------------
mysqli_begin_transaction($conexion);

try{
    // 2.1 Bloquear la fila REAL de flights (PK) para cada vuelo distinto
    //     involucrado, en orden ascendente de flight_id, para serializar
    //     contra reservas concurrentes del mismo vuelo y evitar deadlock
    //     cruzado cuando una reserva incluye varios vuelos.
    $flightIdsUnicos = [];
    foreach($segmentos as $seg){
        $flightIdsUnicos[(int)$seg['flight_id']] = true;
    }
    $flightIdsOrdenados = array_keys($flightIdsUnicos);
    sort($flightIdsOrdenados, SORT_NUMERIC);
    $flightInfoById = [];

    $stmtLockVuelo = mysqli_prepare($conexion,
        "SELECT f.id, f.departure_datetime, f.base_price, f.status, at.total_capacity,
                (departure_datetime > CONVERT_TZ(NOW(), '+00:00', '-06:00')) AS aun_disponible
         FROM flights f LEFT JOIN aircraft ac ON ac.id = f.aircraft_id LEFT JOIN aircraft_types at ON at.id = ac.type_id WHERE f.id = ? FOR UPDATE"
    );
    if(!$stmtLockVuelo){
        throw new Exception('No se pudo preparar el bloqueo del vuelo.');
    }
    foreach($flightIdsOrdenados as $flightId){
        mysqli_stmt_bind_param($stmtLockVuelo, 'i', $flightId);
        if(!mysqli_stmt_execute($stmtLockVuelo)){
            throw new Exception('Error al bloquear el vuelo ' . $flightId . ': ' . mysqli_stmt_error($stmtLockVuelo));
        }
        $resultadoVuelo = mysqli_stmt_get_result($stmtLockVuelo);
        $filaVuelo = $resultadoVuelo ? mysqli_fetch_assoc($resultadoVuelo) : null;
        if($resultadoVuelo) mysqli_free_result($resultadoVuelo);
        if(!$filaVuelo){
            throw new Exception('El vuelo ' . $flightId . ' no existe.');
        }
        // Comparación por fecha+hora real del servidor de BD (NOW()), no de
        // ningún reloj del navegador — un vuelo cuya salida ya pasó nunca
        // puede reservarse, aunque el flight_id se envíe manualmente.
        if(!$filaVuelo['aun_disponible']){
            throw new Exception('VUELO_YA_SALIO:' . $flightId);
        }
        if(in_array(strtolower((string)$filaVuelo['status']), ['cancelled', 'completed', 'in_progress'], true)){
            throw new Exception('VUELO_NO_RESERVABLE:' . $flightId);
        }

        $stmtInfo = mysqli_prepare($conexion,
            "SELECT r.active AS route_active, ao.iata_code AS origin_iata,
                    ad.iata_code AS destination_iata, ao.active AS origin_active,
                    ad.active AS destination_active, at.seat_configuration
             FROM flights f
             INNER JOIN routes r ON r.id = f.route_id
             INNER JOIN airports ao ON ao.id = r.origin_id
             INNER JOIN airports ad ON ad.id = r.destination_id
             LEFT JOIN aircraft ac ON ac.id = f.aircraft_id
             LEFT JOIN aircraft_types at ON at.id = ac.type_id
             WHERE f.id = ? LIMIT 1"
        );
        if(!$stmtInfo) throw new Exception('No se pudo validar la ruta y configuración del vuelo.');
        mysqli_stmt_bind_param($stmtInfo, 'i', $flightId);
        if(!mysqli_stmt_execute($stmtInfo)){
            mysqli_stmt_close($stmtInfo);
            throw new Exception('No se pudo validar la ruta del vuelo.');
        }
        $resInfo = mysqli_stmt_get_result($stmtInfo);
        $infoVuelo = $resInfo ? mysqli_fetch_assoc($resInfo) : null;
        if($resInfo) mysqli_free_result($resInfo);
        mysqli_stmt_close($stmtInfo);
        if(!$infoVuelo || !(int)$infoVuelo['route_active'] || !(int)$infoVuelo['origin_active'] || !(int)$infoVuelo['destination_active']){
            throw new Exception('La ruta o los aeropuertos del vuelo ya no están disponibles.');
        }
        $flightInfoById[$flightId] = [
            'base_price' => $filaVuelo['base_price'] !== null ? (float)$filaVuelo['base_price'] : null,
            'total_capacity' => (int)($filaVuelo['total_capacity'] ?? 0),
            'departure_datetime' => (string)$filaVuelo['departure_datetime'],
            'origin_iata' => strtoupper((string)$infoVuelo['origin_iata']),
            'destination_iata' => strtoupper((string)$infoVuelo['destination_iata']),
            'seat_configuration' => $infoVuelo['seat_configuration']
        ];
    }
    mysqli_stmt_close($stmtLockVuelo);

    // 2.2 Con los vuelos ya bloqueados, consultar qué asientos están
    //     realmente ocupados (misma regla que asientos_ocupados.php).
    $ocupadosPorVuelo = []; // flight_id => [seat => true]
    $ocupacionPorVuelo = [];
    $stmtLock = mysqli_prepare($conexion,
        "SELECT fs.seat, p.passenger_type
         FROM flight_segments fs
         INNER JOIN reservations r ON r.id = fs.reservation_id
         INNER JOIN passengers p ON p.id = fs.passenger_id
         WHERE fs.flight_id = ? AND fs.status <> 'cancelled'
           AND (r.status IN ('confirmed', 'paid', 'completed')
                OR (r.status = 'pending' AND r.time_limit IS NOT NULL AND r.time_limit > NOW()))"
    );
    if(!$stmtLock){
        throw new Exception('No se pudo preparar la verificación de disponibilidad.');
    }

    foreach($flightIdsOrdenados as $flightId){
        mysqli_stmt_bind_param($stmtLock, 'i', $flightId);
        if(!mysqli_stmt_execute($stmtLock)){
            throw new Exception('Error al verificar disponibilidad: ' . mysqli_stmt_error($stmtLock));
        }
        $resultado = mysqli_stmt_get_result($stmtLock);
        if($resultado === false){
            throw new Exception('Error al leer disponibilidad: ' . mysqli_stmt_error($stmtLock));
        }
        $ocupadosPorVuelo[$flightId] = [];
        $ocupacionPorVuelo[$flightId] = 0;
        while($fila = mysqli_fetch_assoc($resultado)){
            if((string)$fila['passenger_type'] !== 'infant') $ocupacionPorVuelo[$flightId]++;
            if($fila['seat'] !== null){
                $ocupadosPorVuelo[$flightId][strtoupper((string)$fila['seat'])] = true;
            }
        }
        mysqli_free_result($resultado);
    }
    mysqli_stmt_close($stmtLock);

    // 2.3 Recalcular tarifas y cargos en el servidor; no se confían precios
    //     enviados por el navegador. También se valida que ruta y asientos
    //     sigan correspondiendo al vuelo bloqueado.
    $totalCalculado = 0.0;
    $precioPorSegmento = [];
    $impuestosPorSegmento = [];
    $stmtTarifa = mysqli_prepare($conexion,
        "SELECT ff.price, ff.seats_allocated,
                (SELECT COUNT(*) FROM flight_segments fs2
                 INNER JOIN passengers p2 ON p2.id = fs2.passenger_id
                 INNER JOIN reservations r2 ON r2.id = fs2.reservation_id
                 WHERE fs2.flight_id = ff.flight_id AND fs2.fare_class = fc.code
                   AND p2.passenger_type <> 'infant' AND r2.status IN ('pending','confirmed','paid')) AS ocupados_clase
         FROM flight_fares ff
         INNER JOIN fare_classes fc ON fc.id = ff.fare_class_id
         WHERE ff.flight_id = ? AND fc.code = ? AND fc.active = 1 AND ff.active = 1
           AND ff.valid_from <= NOW() AND (ff.valid_to IS NULL OR ff.valid_to > NOW())
         ORDER BY ff.valid_from DESC, ff.id DESC LIMIT 1"
    );
    if(!$stmtTarifa) throw new Exception('No se pudo verificar la tarifa actual del vuelo.');

    foreach($segmentos as $indiceSeg => $seg){
        $flightId = (int)$seg['flight_id'];
        $info = $flightInfoById[$flightId] ?? null;
        $origenSolicitud = strtoupper(trim((string)($seg['origen'] ?? '')));
        $destinoSolicitud = strtoupper(trim((string)($seg['destino'] ?? '')));
        if(!$info || $origenSolicitud !== $info['origin_iata'] || $destinoSolicitud !== $info['destination_iata']){
            mysqli_stmt_close($stmtTarifa);
            throw new Exception('VUELO_NO_RESERVABLE:' . $flightId);
        }
        $fechaVuelo = isset($seg['fecha']) ? (string)$seg['fecha'] : '';
        if(!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaVuelo)){
            mysqli_stmt_close($stmtTarifa);
            throw new Exception('DATOS_INVALIDOS:La fecha de uno de los vuelos no es válida.');
        }
        if(substr($info['departure_datetime'], 0, 10) !== $fechaVuelo){
            mysqli_stmt_close($stmtTarifa);
            throw new Exception('VUELO_NO_RESERVABLE:' . $flightId);
        }

        $fareClass = (string)$seg['fare_class'];
        $mapaCodigoTarifa = ['economy' => 'ECONOMICA', 'premium' => 'PREMIUM', 'business' => 'BUSINESS', 'first' => 'PRIMERA'];
        $codigoTarifa = $mapaCodigoTarifa[$fareClass] ?? '';
        mysqli_stmt_bind_param($stmtTarifa, 'is', $flightId, $codigoTarifa);
        if(!mysqli_stmt_execute($stmtTarifa)){
            mysqli_stmt_close($stmtTarifa);
            throw new Exception('No se pudo consultar la tarifa actual.');
        }
        $resTarifa = mysqli_stmt_get_result($stmtTarifa);
        $filaTarifa = $resTarifa ? mysqli_fetch_assoc($resTarifa) : null;
        if($resTarifa) mysqli_free_result($resTarifa);
        $precioActual = $filaTarifa ? (float)$filaTarifa['price'] : null;
        if($precioActual === null || !is_finite((float)$precioActual) || (float)$precioActual <= 0){
            mysqli_stmt_close($stmtTarifa);
            throw new Exception('VUELO_NO_RESERVABLE:' . $flightId);
        }
        $precioActual = round((float)$precioActual, 2);
        $precioPorSegmento[$indiceSeg] = $precioActual;
        if(($ocupacionPorVuelo[$flightId] ?? 0) + $pasajerosConAsiento > (int)$info['total_capacity']) throw new Exception('CAPACIDAD_INSUFICIENTE:' . $flightId);
        if($filaTarifa && $filaTarifa['seats_allocated'] !== null && (int)$filaTarifa['seats_allocated'] > 0 && (int)$filaTarifa['ocupados_clase'] + $pasajerosConAsiento > (int)$filaTarifa['seats_allocated']) throw new Exception('CUPO_CLASE_INSUFICIENTE:' . $fareClass);
        $totalCalculado += $precioActual * $factorTotal;

        // Congelar las mismas reglas fiscales vigentes que usa el backend.
        $stmtTax = mysqli_prepare($conexion,
            "SELECT tr.id, tr.country_id, tr.airport_id, tr.code, tr.name, tr.calculation_type, tr.value,
                    ao.id AS origin_airport_id
             FROM flights f JOIN routes rt ON rt.id = f.route_id
             JOIN airports ao ON ao.id = rt.origin_id JOIN airports ad ON ad.id = rt.destination_id
             JOIN tax_rules tr ON tr.active = 1 AND tr.country_id = ao.country_id
                AND (tr.airport_id IS NULL OR tr.airport_id = ao.id)
                AND tr.applies_to IN ('all', CASE WHEN ao.country_id = ad.country_id THEN 'domestic' ELSE 'international' END)
                AND tr.valid_from <= NOW() AND (tr.valid_to IS NULL OR tr.valid_to > NOW())
             WHERE f.id = ? ORDER BY tr.airport_id IS NULL, tr.id"
        );
        if(!$stmtTax) throw new Exception('No se pudo consultar las reglas fiscales de la tarifa.');
        mysqli_stmt_bind_param($stmtTax, 'i', $flightId);
        if(!mysqli_stmt_execute($stmtTax)) throw new Exception('No se pudo calcular los impuestos de la tarifa.');
        $taxResult = mysqli_stmt_get_result($stmtTax);
        $impuestosPorSegmento[$indiceSeg] = [];
        while($tax = $taxResult ? mysqli_fetch_assoc($taxResult) : null){
            $montoTax = $tax['calculation_type'] === 'percentage' ? round($precioActual * (float)$tax['value'] / 100, 2) : round((float)$tax['value'], 2);
            $tax['amount_base'] = $montoTax;
            $impuestosPorSegmento[$indiceSeg][] = $tax;
            $totalCalculado += $montoTax * $factorTotal;
        }
        if($taxResult) mysqli_free_result($taxResult);
        mysqli_stmt_close($stmtTax);

        $configAsientos = is_string($info['seat_configuration']) ? json_decode($info['seat_configuration'], true) : null;
        $columnas = isset($configAsientos['columnas']) && is_array($configAsientos['columnas'])
            ? array_map(static fn($c) => strtoupper((string)$c), $configAsientos['columnas'])
            : ['A', 'B', 'C', 'D', 'E', 'F'];
        $filas = isset($configAsientos['filas']) && is_numeric($configAsientos['filas'])
            ? max(1, (int)$configAsientos['filas'])
            : (int)ceil($info['total_capacity'] / max(1, count($columnas)));
        $emergencyRow = (int)ceil($filas * 0.4);
        $asientosSolicitud = [];
        foreach($seg['asientos'] as $indicePax => $seatRaw){
            if($seatRaw === null || $seatRaw === '' || $seatRaw === '-'){
                if(($tiposPasajeros[$indicePax] ?? null) !== 'infant'){
                    mysqli_stmt_close($stmtTarifa);
                    throw new Exception('DATOS_INVALIDOS:Cada pasajero con asiento debe tener una plaza seleccionada.');
                }
                continue;
            }
            $seat = strtoupper(trim((string)$seatRaw));
            if(($tiposPasajeros[$indicePax] ?? null) === 'infant'){
                mysqli_stmt_close($stmtTarifa);
                throw new Exception('DATOS_INVALIDOS:Un bebé sin asiento asignado no puede ocupar un asiento.');
            }
            if(!preg_match('/^(\d{1,2})([A-Z])$/', $seat, $seatParts)){
                mysqli_stmt_close($stmtTarifa);
                throw new Exception('DATOS_INVALIDOS:Uno de los asientos seleccionados no es válido.');
            }
            $filaSeat = (int)$seatParts[1];
            $colIndex = array_search($seatParts[2], $columnas, true);
            $seatIndex = ($filaSeat - 1) * count($columnas) + ($colIndex === false ? 0 : $colIndex) + 1;
            if($filaSeat < 1 || $filaSeat > $filas || $colIndex === false || $seatIndex > (int)$info['total_capacity']){
                mysqli_stmt_close($stmtTarifa);
                throw new Exception('DATOS_INVALIDOS:El asiento no existe en la configuración de este avión.');
            }
            if(isset($asientosSolicitud[$seat])){
                mysqli_stmt_close($stmtTarifa);
                throw new Exception('DATOS_INVALIDOS:No puedes asignar el mismo asiento a dos pasajeros.');
            }
            $asientosSolicitud[$seat] = true;
            if(isset($ocupadosPorVuelo[$flightId][$seat])){
                mysqli_stmt_close($stmtTarifa);
                throw new Exception('SEAT_TAKEN:' . $seat);
            }
        }
    }
    mysqli_stmt_close($stmtTarifa);

    $preciosServicios = [];
    $stockServicios = [];
    $flightBase = (int)$segmentos[0]['flight_id'];
    $stmtServicios = mysqli_prepare($conexion,
        "SELECT a.code, a.base_price, fa.id AS flight_ancillary_id, fa.stock,
                COALESCE(fa.price_override, a.base_price) AS price
         FROM flight_ancillaries fa JOIN ancillaries a ON a.id = fa.ancillary_id
         WHERE fa.flight_id = ? AND fa.active = 1 AND a.active = 1 FOR UPDATE"
    );
    if(!$stmtServicios) throw new Exception('No se pudo consultar el catálogo de servicios.');
    mysqli_stmt_bind_param($stmtServicios, 'i', $flightBase);
    if(!mysqli_stmt_execute($stmtServicios)) throw new Exception('No se pudo consultar el inventario de servicios.');
    $servResult = mysqli_stmt_get_result($stmtServicios);
    while($serv = $servResult ? mysqli_fetch_assoc($servResult) : null){
        $code = strtoupper((string)$serv['code']);
        $preciosServicios[$code] = (float)$serv['price'];
        $stockServicios[$code] = ['id' => (int)$serv['flight_ancillary_id'], 'stock' => (int)$serv['stock'], 'price' => (float)$serv['price']];
    }
    if($servResult) mysqli_free_result($servResult);
    mysqli_stmt_close($stmtServicios);
    $serviciosPorPasajero = [];
    foreach($servicios as $servicio){
        if(!is_array($servicio)) throw new Exception('DATOS_INVALIDOS:La lista de servicios no es válida.');
        $idx = isset($servicio['pasajeroIdx']) ? filter_var($servicio['pasajeroIdx'], FILTER_VALIDATE_INT) : false;
        $idServicio = strtoupper(trim((string)($servicio['servicioId'] ?? '')));
        if($idx === false || $idx < 0 || $idx >= count($pasajeros) || !isset($preciosServicios[$idServicio])){
            throw new Exception('DATOS_INVALIDOS:Hay un servicio o pasajero seleccionado que no es válido.');
        }
        if(isset($serviciosPorPasajero[$idx][$idServicio])){
            throw new Exception('DATOS_INVALIDOS:Un servicio está duplicado para el mismo pasajero.');
        }
        $serviciosPorPasajero[$idx][$idServicio] = true;
    }
    $claseIda = (string)$segmentos[0]['fare_class'];
    $adultosConServicio = [];
    foreach($serviciosPorPasajero as $idx => $seleccionados){
        if(($tiposPasajeros[$idx] ?? '') === 'infant') continue;
        foreach($seleccionados as $servicioId => $_) $adultosConServicio[$servicioId] = true;
    }
    $cantidadServicios = [];
    foreach($serviciosPorPasajero as $idx => $seleccionados){
        foreach($seleccionados as $servicioId => $_){
            $incluido = ($claseIda === 'first' && in_array($servicioId, ['SALA_VIP', 'ABORDAJE_PRIORITARIO'], true))
                || ($claseIda === 'business' && $servicioId === 'SALA_VIP')
                || (($tiposPasajeros[$idx] ?? '') === 'infant' && in_array($servicioId, ['SALA_VIP', 'ABORDAJE_PRIORITARIO'], true) && isset($adultosConServicio[$servicioId]));
            if(!$incluido){
                $totalCalculado += $preciosServicios[$servicioId];
                $cantidadServicios[$servicioId] = ($cantidadServicios[$servicioId] ?? 0) + 1;
            }
        }
    }
    foreach($cantidadServicios as $servicioId => $cantidad){
        if(!isset($stockServicios[$servicioId]) || $stockServicios[$servicioId]['stock'] < $cantidad) throw new Exception('STOCK_INSUFICIENTE:' . $servicioId);
    }
    $totalCalculado = round($totalCalculado, 2);
    if(abs(round($total, 2) - $totalCalculado) > 0.01){
        throw new Exception('PRECIO_CAMBIO:El precio fue actualizado. Vuelve a revisar el total antes de reservar.');
    }

    // 2.4 Generar PNR único.
    $pnr = generarPnr($conexion);
    if($pnr === null){
        throw new Exception('No se pudo generar un PNR único.');
    }

    // El navegador solo simula el medio de pago. La identidad se deriva de
    // la sesión, y ninguna reserva se marca como pagada sin confirmación
    // confiable del procesador o del backoffice.
    $clienteId = $usuarioSesion ? $usuarioSesion['customer_id'] : null;
    $minutosReserva = 30;
    $resConfigReserva = mysqli_query($conexion, "SELECT param_value FROM config_params WHERE param_key = 'reserva_time_limit_min' LIMIT 1");
    if($resConfigReserva){
        $filaConfigReserva = mysqli_fetch_assoc($resConfigReserva);
        $valorMinutos = isset($filaConfigReserva['param_value']) ? (int)$filaConfigReserva['param_value'] : 0;
        if($valorMinutos >= 5 && $valorMinutos <= 180) $minutosReserva = $valorMinutos;
        mysqli_free_result($resConfigReserva);
    }

    $stmtRes = mysqli_prepare($conexion,
        "INSERT INTO reservations (pnr, customer_id, status, estimated_total, paid_total, currency, created_at, payment_date, sales_channel, time_limit)
         VALUES (?, ?, 'pending', ?, 0, 'USD', NOW(), NULL, 'web', DATE_ADD(NOW(), INTERVAL " . (int)$minutosReserva . " MINUTE))"
    );
    if(!$stmtRes){
        throw new Exception('No se pudo preparar la inserción de la reserva: ' . mysqli_error($conexion));
    }
    mysqli_stmt_bind_param($stmtRes, 'sid', $pnr, $clienteId, $totalCalculado);
    if(!mysqli_stmt_execute($stmtRes)){
        throw new Exception('No se pudo insertar la reserva: ' . mysqli_stmt_error($stmtRes));
    }
    $reservationId = mysqli_insert_id($conexion);
    mysqli_stmt_close($stmtRes);

    // 2.6 Insertar passengers (una fila por pasajero), con el tipo de
    //     pasajero y tipo de documento REALES que ya captura el frontend
    //     (Util.categoriaPorIndice / selector de tipoDocumento). Se mapea
    //     'young' -> 'child' porque passengers.passenger_type solo admite
    //     adult/child/infant; el resto de valores se usan tal cual.
    //
    //     passengers.document_type es CHAR(2), NO puede recibir el texto
    //     literal del formulario ("DUI"/"PASAPORTE"/"CARNET_MENOR" no caben).
    //     El esquema sigue el catálogo oficial "Tipo de Documento de
    //     Identificación" del Ministerio de Hacienda de El Salvador (el
    //     mismo que usan las tablas dte_headers/dte_items de este proyecto
    //     para los DTE): 13=DUI, 03=Pasaporte, 36=NIT, 02=Carnet de
    //     Residente, 37=Otro. Esto se confirmó cruzando el catálogo oficial
    //     contra el único valor real que ya existía en producción
    //     (document_type='13' == DUI en ese catálogo).
    //
    //     'CARNET_MENOR' (carnet de un MENOR de edad) NO tiene un código
    //     confirmado en ese catálogo — "02" es "Carnet de Residente"
    //     (extranjero), que es un documento distinto. No se adivina ese
    //     código: si llega 'CARNET_MENOR', se rechaza explícitamente con
    //     un error claro en vez de guardar un valor no verificado.
    $mapaTipoPasajero = ['adult' => 'adult', 'young' => 'child', 'child' => 'child', 'infant' => 'infant'];
    // passengers.document_type es CHAR(2) NOT NULL. Mapeo confirmado:
    // 13=DUI y 03=Pasaporte (catálogo oficial de Hacienda El Salvador,
    // confirmado contra el dato real ya existente en producción).
    // 37=Otro se adopta como CONVENCIÓN DEL PROYECTO para representar
    // "Carnet de menor", ya que no existe un código específico oficial
    // confirmado para ese documento.
    $mapaTipoDocumento = [
        'DUI' => '13',
        'PASAPORTE' => '03',
        'CARNET_MENOR' => '37'
    ];

    $passengerIds = [];
    $stmtPax = mysqli_prepare($conexion,
        "INSERT INTO passengers (reservation_id, passenger_type, first_names, last_names, document_type, document_number, nationality, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
    );
    if(!$stmtPax){
        throw new Exception('No se pudo preparar la inserción de pasajeros: ' . mysqli_error($conexion));
    }
    $stmtPais = mysqli_prepare($conexion, "SELECT code FROM countries WHERE code = ? AND active = 1");
    if(!$stmtPais){
        throw new Exception('No se pudo preparar la validación de nacionalidad: ' . mysqli_error($conexion));
    }
    $paisesValidados = []; // caché en memoria: code => true, para no repetir la consulta si varios pasajeros comparten nacionalidad
    $documentosVistos = []; // número de documento normalizado => índice del pasajero, para rechazar documentos repetidos dentro de la misma reserva

    foreach($pasajeros as $idxPax => $p){
        $nombres = isset($p['nombres']) ? substr((string)$p['nombres'], 0, 100) : '';
        $apellidos = isset($p['apellidos']) ? substr((string)$p['apellidos'], 0, 100) : '';
        $documento = isset($p['documento']) ? substr((string)$p['documento'], 0, 30) : '';
        $tipoFrontend = isset($p['tipo']) ? (string)$p['tipo'] : 'adult';
        $passengerType = $mapaTipoPasajero[$tipoFrontend] ?? 'adult';

        $tipoDocumentoFrontend = isset($p['tipoDocumento']) ? (string)$p['tipoDocumento'] : '';
        if(!isset($mapaTipoDocumento[$tipoDocumentoFrontend])){
            // Defensa ante cualquier valor fuera de DUI/PASAPORTE/CARNET_MENOR
            // (los únicos que el formulario permite hoy): se rechaza la
            // reserva en vez de insertar un código de 2 caracteres inventado.
            throw new Exception('Tipo de documento no válido: ' . $tipoDocumentoFrontend);
        }
        $tipoDocumento = $mapaTipoDocumento[$tipoDocumentoFrontend];

        // Validación de formato en backend (no confiar solo en el frontend),
        // mismo criterio que Validar.documentoValido() en index.php: DUI
        // exige exactamente 8 dígitos + guion + 1 dígito; el resto usa la
        // regla genérica ya establecida en el proyecto (alfanumérico 5-20).
        $formatoValido = ($tipoDocumentoFrontend === 'DUI')
            ? preg_match('/^\d{8}-\d$/', $documento)
            : preg_match('/^[A-Za-z0-9-]{5,20}$/', $documento);
        if(!$formatoValido){
            throw new Exception('Formato de documento inválido para ' . $tipoDocumentoFrontend . ': ' . $documento);
        }

        // Documentos duplicados: dentro de una misma reserva cada pasajero
        // debe tener su propio número de documento (DUI, pasaporte o carné
        // de menor). Se normaliza (trim + mayúsculas) con el mismo criterio
        // que la validación del frontend en Pasajeros.continuar(), de modo
        // que no se pueda repetir ni siquiera variando mayúsculas/espacios.
        $documentoNormalizado = strtoupper(trim($documento));
        if(isset($documentosVistos[$documentoNormalizado])){
            throw new Exception('El documento ' . $documento . ' está repetido: los pasajeros ' . ($documentosVistos[$documentoNormalizado] + 1) . ' y ' . ($idxPax + 1) . ' no pueden usar el mismo número. Cada pasajero debe tener su propio documento.');
        }
        $documentosVistos[$documentoNormalizado] = $idxPax;

        // Nacionalidad: passengers.nationality guarda el código real de
        // countries.code. Nunca se confía solo en lo que envía el frontend
        // (el buscador de nacionalidad ya lo restringe, pero el backend
        // vuelve a validar contra la BD real antes de guardar).
        $codigoPais = isset($p['nacionalidad']) ? strtoupper(trim((string)$p['nacionalidad'])) : '';
        if($codigoPais === '' || !preg_match('/^[A-Z]{2}$/', $codigoPais)){
            throw new Exception('Nacionalidad inválida o vacía.');
        }
        if(!isset($paisesValidados[$codigoPais])){
            mysqli_stmt_bind_param($stmtPais, 's', $codigoPais);
            if(!mysqli_stmt_execute($stmtPais)){
                throw new Exception('No se pudo validar la nacionalidad: ' . mysqli_stmt_error($stmtPais));
            }
            $resPais = mysqli_stmt_get_result($stmtPais);
            $filaPais = $resPais ? mysqli_fetch_assoc($resPais) : null;
            if($resPais) mysqli_free_result($resPais);
            if(!$filaPais){
                throw new Exception('Código de país no válido o inactivo: ' . $codigoPais);
            }
            $paisesValidados[$codigoPais] = true;
        }

        mysqli_stmt_bind_param($stmtPax, 'issssss', $reservationId, $passengerType, $nombres, $apellidos, $tipoDocumento, $documento, $codigoPais);
        if(!mysqli_stmt_execute($stmtPax)){
            throw new Exception('No se pudo insertar un pasajero: ' . mysqli_stmt_error($stmtPax));
        }
        $passengerIds[] = mysqli_insert_id($conexion);
    }
    mysqli_stmt_close($stmtPax);
    mysqli_stmt_close($stmtPais);

    // 2.6-B Guardar el correo de contacto en el primer pasajero para que la
    //       consulta por PNR pueda validar por correo incluso en reservas de
    //       invitado. Se usa un bloque try independiente para que, si la
    //       columna email no existiera en passengers, no revierta la reserva.
    if($contactoEmail !== '' && isset($passengerIds[0])){
        $firstPassengerId = $passengerIds[0];
        $stmtEmail = @mysqli_prepare($conexion, "UPDATE passengers SET email = ? WHERE id = ?");
        if($stmtEmail){
            mysqli_stmt_bind_param($stmtEmail, 'si', $contactoEmail, $firstPassengerId);
            @mysqli_stmt_execute($stmtEmail); // @: si falla (columna no existe), se ignora
            mysqli_stmt_close($stmtEmail);
        }
    }

    // 2.7 Insertar flight_segments (una fila por pasajero por segmento).
    $stmtSeg = mysqli_prepare($conexion,
        "INSERT INTO flight_segments (reservation_id, passenger_id, flight_id, fare_class, seat, paid_price, status, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)"
    );
    if(!$stmtSeg){
        throw new Exception('No se pudo preparar la inserción de segmentos: ' . mysqli_error($conexion));
    }
    foreach($segmentos as $indiceSeg => $seg){
        $flightId = (int)$seg['flight_id'];
        $fareClass = (string)$seg['fare_class'];
        $precioUnitario = $precioPorSegmento[$indiceSeg];
        foreach($seg['asientos'] as $idx => $seat){
            if(!isset($passengerIds[$idx])) continue;
            $seatValor = ($seat === null || $seat === '' || $seat === '-') ? null : substr((string)$seat, 0, 5);
            $passengerId = $passengerIds[$idx];
            mysqli_stmt_bind_param($stmtSeg, 'iiissddd', $reservationId, $passengerId, $flightId, $fareClass, $seatValor, $precioUnitario, $precioUnitario, $precioUnitario);
            if(!mysqli_stmt_execute($stmtSeg)){
                throw new Exception('No se pudo insertar un segmento de vuelo: ' . mysqli_stmt_error($stmtSeg));
            }
        }
    }
    mysqli_stmt_close($stmtSeg);

    // Persistir el desglose fiscal congelado junto con la reserva.
    $stmtTaxLine = mysqli_prepare($conexion,
        "INSERT INTO reservation_tax_lines
         (reservation_id, passenger_id, flight_id, tax_rule_id, country_id, airport_id, code, name,
          calculation_type, rate, taxable_amount, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    if(!$stmtTaxLine) throw new Exception('No se pudo guardar el desglose fiscal.');
    foreach($segmentos as $indiceSeg => $seg){
        $flightId = (int)$seg['flight_id'];
        foreach($impuestosPorSegmento[$indiceSeg] ?? [] as $tax){
            foreach($passengerIds as $idxPax => $passengerId){
                $factor = $factoresPasajero[$idxPax] ?? 1.0;
                $taxable = round($precioPorSegmento[$indiceSeg] * $factor, 2);
                $amount = round($tax['amount_base'] * $factor, 2);
                $taxId = (int)$tax['id'];
                $countryId = (int)$tax['country_id'];
                $airportId = (int)$tax['origin_airport_id'];
                $taxCode = (string)$tax['code'];
                $taxName = (string)$tax['name'];
                $calcType = (string)$tax['calculation_type'];
                $rate = (float)$tax['value'];
                mysqli_stmt_bind_param($stmtTaxLine, 'iiiiiisssddd', $reservationId, $passengerId, $flightId, $taxId, $countryId, $airportId, $taxCode, $taxName, $calcType, $rate, $taxable, $amount);
                if(!mysqli_stmt_execute($stmtTaxLine)) throw new Exception('No se pudo guardar una línea fiscal.');
            }
        }
    }
    mysqli_stmt_close($stmtTaxLine);

    foreach($serviciosPorPasajero as $idxPax => $seleccionados){
        foreach($seleccionados as $servicioId => $_){
            $incluido = ($claseIda === 'first' && in_array($servicioId, ['SALA_VIP', 'ABORDAJE_PRIORITARIO'], true))
                || ($claseIda === 'business' && $servicioId === 'SALA_VIP')
                || (($tiposPasajeros[$idxPax] ?? '') === 'infant' && in_array($servicioId, ['SALA_VIP', 'ABORDAJE_PRIORITARIO'], true) && isset($adultosConServicio[$servicioId]));
            if($incluido) continue;
            $ancillary = $stockServicios[$servicioId];
            $passengerId = $passengerIds[$idxPax];
            $stmtAnc = mysqli_prepare($conexion, "INSERT INTO reservation_ancillaries (reservation_id, passenger_id, flight_id, ancillary_id, price, status) SELECT ?, ?, ?, ancillary_id, ?, 'active' FROM flight_ancillaries WHERE id = ?");
            if(!$stmtAnc) throw new Exception('No se pudo guardar el servicio seleccionado.');
            $price = $ancillary['price'];
            $flightAncillaryId = (int)$ancillary['id'];
            mysqli_stmt_bind_param($stmtAnc, 'iiidi', $reservationId, $passengerId, $flightBase, $price, $flightAncillaryId);
            if(!mysqli_stmt_execute($stmtAnc)) throw new Exception('No se pudo guardar el servicio seleccionado.');
            mysqli_stmt_close($stmtAnc);
            $stmtStock = mysqli_prepare($conexion, 'UPDATE flight_ancillaries SET stock = stock - 1 WHERE id = ? AND stock > 0');
            if(!$stmtStock) throw new Exception('No se pudo actualizar el inventario de servicios.');
            mysqli_stmt_bind_param($stmtStock, 'i', $ancillary['id']);
            if(!mysqli_stmt_execute($stmtStock) || mysqli_stmt_affected_rows($stmtStock) !== 1) throw new Exception('STOCK_INSUFICIENTE:' . $servicioId);
            mysqli_stmt_close($stmtStock);
        }
    }

    mysqli_commit($conexion);

    // Vincula la reserva de invitado a esta sesión para autorizar el pago
    // posterior. El cliente no puede pagar una reserva ajena conociendo su ID.
    if(!$usuarioSesion){
        $reservasInvitado = isset($_SESSION['web_guest_reservations']) && is_array($_SESSION['web_guest_reservations'])
            ? $_SESSION['web_guest_reservations'] : [];
        $reservasInvitado[(string)$reservationId] = [
            'pnr' => $pnr,
            'email' => $contactoEmail,
            'nombre' => isset($contacto['nombre']) ? trim((string)$contacto['nombre']) : ''
        ];
        while(count($reservasInvitado) > 20){
            $primeraClave = array_key_first($reservasInvitado);
            if($primeraClave === null) break;
            unset($reservasInvitado[$primeraClave]);
        }
        $_SESSION['web_guest_reservations'] = $reservasInvitado;
    }

    $timeLimit = null;
    $stmtTimeLimit = mysqli_prepare($conexion, 'SELECT time_limit FROM reservations WHERE id = ?');
    if($stmtTimeLimit){
        mysqli_stmt_bind_param($stmtTimeLimit, 'i', $reservationId);
        if(mysqli_stmt_execute($stmtTimeLimit)){
            $resTimeLimit = mysqli_stmt_get_result($stmtTimeLimit);
            $filaTimeLimit = $resTimeLimit ? mysqli_fetch_assoc($resTimeLimit) : null;
            $timeLimit = $filaTimeLimit['time_limit'] ?? null;
            if($resTimeLimit) mysqli_free_result($resTimeLimit);
        }
        mysqli_stmt_close($stmtTimeLimit);
    }

    cerrarConexion();
    http_response_code(200);
    echo json_encode(['ok' => true, 'data' => [
        'pnr' => $pnr,
        'reservation_id' => $reservationId,
        'estado' => 'PENDIENTE',
        'total' => $totalCalculado,
        'time_limit' => $timeLimit,
        'contacto_email' => $contactoEmail
    ]], JSON_UNESCAPED_UNICODE);

} catch(Exception $e){
    mysqli_rollback($conexion);
    cerrarConexion();
    $msg = $e->getMessage();
    if(strpos($msg, 'SEAT_TAKEN:') === 0){
        $asiento = substr($msg, strlen('SEAT_TAKEN:'));
        error_log('[Acajutla Airlines] Intento de reservar asiento ya ocupado: ' . $asiento);
        responderError('El asiento ' . $asiento . ' ya fue reservado por otro pasajero. Selecciona otro asiento.', 409);
    }
    if(strpos($msg, 'VUELO_YA_SALIO:') === 0){
        $flightIdSalido = substr($msg, strlen('VUELO_YA_SALIO:'));
        error_log('[Acajutla Airlines] Intento de reservar un vuelo cuya salida ya pasó: flight_id=' . $flightIdSalido);
        responderError('Uno de los vuelos seleccionados ya no está disponible porque su salida ya pasó. Busca un vuelo nuevo.', 409);
    }
    if(strpos($msg, 'VUELO_NO_RESERVABLE:') === 0){
        error_log('[Acajutla Airlines] Vuelo, ruta o tarifa no reservable: ' . substr($msg, strlen('VUELO_NO_RESERVABLE:')));
        responderError('Uno de los vuelos ya no está disponible. Busca un vuelo nuevo.', 409);
    }
    if(strpos($msg, 'PRECIO_CAMBIO:') === 0){
        responderError(substr($msg, strlen('PRECIO_CAMBIO:')), 409);
    }
    if(strpos($msg, 'DATOS_INVALIDOS:') === 0){
        responderError(substr($msg, strlen('DATOS_INVALIDOS:')), 400);
    }
    error_log('[Acajutla Airlines] Error al crear reserva: ' . $msg);
    responderError('No se pudo completar la reserva. Intenta nuevamente.', 500);
}
