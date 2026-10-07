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
 * Como el pago (Api.crearPago) ya se procesó ANTES de llegar aquí, la
 * reserva se crea directamente en status='paid' (no 'pending'), y cada
 * flight_segments en status='confirmed'.
 *
 * Respuesta:
 *   Éxito: {"ok":true,"data":{"pnr":"AB12CD", ...}}
 *   Error: {"ok":false,"error":"..."} (mensaje genérico; detalle técnico
 *          solo en error_log(), nunca expuesto)
 * =====================================================================
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexion.php';

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

    $stmtLockVuelo = mysqli_prepare($conexion, "SELECT id FROM flights WHERE id = ? FOR UPDATE");
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
    }
    mysqli_stmt_close($stmtLockVuelo);

    // 2.2 Con los vuelos ya bloqueados, consultar qué asientos están
    //     realmente ocupados (misma regla que asientos_ocupados.php).
    $ocupadosPorVuelo = []; // flight_id => [seat => true]
    $stmtLock = mysqli_prepare($conexion,
        "SELECT fs.seat, r.status, r.time_limit
         FROM flight_segments fs
         INNER JOIN reservations r ON r.id = fs.reservation_id
         WHERE fs.flight_id = ? AND fs.status <> 'cancelled'"
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
        while($fila = mysqli_fetch_assoc($resultado)){
            $reservaOcupa = $fila['status'] !== 'cancelled'
                && ($fila['status'] !== 'pending' || $fila['time_limit'] === null || strtotime($fila['time_limit']) > time());
            if($reservaOcupa && $fila['seat'] !== null){
                $ocupadosPorVuelo[$flightId][$fila['seat']] = true;
            }
        }
        mysqli_free_result($resultado);
    }
    mysqli_stmt_close($stmtLock);

    // 2.3 Verificar, ya con el vuelo bloqueado, que ningún asiento pedido esté ocupado.
    foreach($segmentos as $seg){
        $flightId = (int)$seg['flight_id'];
        foreach($seg['asientos'] as $seat){
            if($seat === null || $seat === '' || $seat === '-') continue;
            if(isset($ocupadosPorVuelo[$flightId][$seat])){
                throw new Exception('SEAT_TAKEN:' . $seat);
            }
        }
    }

    // 2.4 Generar PNR único.
    $pnr = generarPnr($conexion);
    if($pnr === null){
        throw new Exception('No se pudo generar un PNR único.');
    }

    // 2.5 Insertar reservations. El pago ya se procesó antes de llegar aquí
    //     (Api.crearPago), por eso status='paid' directamente.
    $clienteId = isset($payload['cliente_id']) && ctype_digit((string)$payload['cliente_id']) ? (int)$payload['cliente_id'] : null;

    $stmtRes = mysqli_prepare($conexion,
        "INSERT INTO reservations (pnr, customer_id, status, estimated_total, paid_total, currency, created_at, payment_date, sales_channel)
         VALUES (?, ?, 'paid', ?, ?, 'USD', NOW(), NOW(), 'web')"
    );
    if(!$stmtRes){
        throw new Exception('No se pudo preparar la inserción de la reserva: ' . mysqli_error($conexion));
    }
    mysqli_stmt_bind_param($stmtRes, 'sidd', $pnr, $clienteId, $total, $total);
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
    $mapaTipoPasajero = ['adult' => 'adult', 'young' => 'child', 'child' => 'child', 'infant' => 'infant'];
    $tiposDocumentoValidos = ['DUI', 'PASAPORTE', 'CARNET_MENOR'];

    $passengerIds = [];
    $stmtPax = mysqli_prepare($conexion,
        "INSERT INTO passengers (reservation_id, passenger_type, first_names, last_names, document_type, document_number, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())"
    );
    if(!$stmtPax){
        throw new Exception('No se pudo preparar la inserción de pasajeros: ' . mysqli_error($conexion));
    }
    foreach($pasajeros as $p){
        $nombres = isset($p['nombres']) ? substr((string)$p['nombres'], 0, 100) : '';
        $apellidos = isset($p['apellidos']) ? substr((string)$p['apellidos'], 0, 100) : '';
        $documento = isset($p['documento']) ? substr((string)$p['documento'], 0, 30) : '';
        $tipoFrontend = isset($p['tipo']) ? (string)$p['tipo'] : 'adult';
        $passengerType = $mapaTipoPasajero[$tipoFrontend] ?? 'adult';
        $tipoDocumento = isset($p['tipoDocumento']) && in_array($p['tipoDocumento'], $tiposDocumentoValidos, true)
            ? $p['tipoDocumento']
            : 'DUI'; // valor por defecto actual del proyecto, no se sobrescribe si el frontend ya envía otro
        mysqli_stmt_bind_param($stmtPax, 'isssss', $reservationId, $passengerType, $nombres, $apellidos, $tipoDocumento, $documento);
        if(!mysqli_stmt_execute($stmtPax)){
            throw new Exception('No se pudo insertar un pasajero: ' . mysqli_stmt_error($stmtPax));
        }
        $passengerIds[] = mysqli_insert_id($conexion);
    }
    mysqli_stmt_close($stmtPax);

    // 2.7 Insertar flight_segments (una fila por pasajero por segmento).
    $stmtSeg = mysqli_prepare($conexion,
        "INSERT INTO flight_segments (reservation_id, passenger_id, flight_id, fare_class, seat, paid_price, status)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed')"
    );
    if(!$stmtSeg){
        throw new Exception('No se pudo preparar la inserción de segmentos: ' . mysqli_error($conexion));
    }
    foreach($segmentos as $seg){
        $flightId = (int)$seg['flight_id'];
        $fareClass = (string)$seg['fare_class'];
        $precioUnitario = isset($seg['precio_unitario']) && is_numeric($seg['precio_unitario']) ? (float)$seg['precio_unitario'] : 0.0;
        foreach($seg['asientos'] as $idx => $seat){
            if(!isset($passengerIds[$idx])) continue;
            $seatValor = ($seat === null || $seat === '' || $seat === '-') ? null : substr((string)$seat, 0, 5);
            $passengerId = $passengerIds[$idx];
            mysqli_stmt_bind_param($stmtSeg, 'iiissd', $reservationId, $passengerId, $flightId, $fareClass, $seatValor, $precioUnitario);
            if(!mysqli_stmt_execute($stmtSeg)){
                throw new Exception('No se pudo insertar un segmento de vuelo: ' . mysqli_stmt_error($stmtSeg));
            }
        }
    }
    mysqli_stmt_close($stmtSeg);

    mysqli_commit($conexion);

    cerrarConexion();
    http_response_code(200);
    echo json_encode(['ok' => true, 'data' => ['pnr' => $pnr, 'reservation_id' => $reservationId]], JSON_UNESCAPED_UNICODE);

} catch(Exception $e){
    mysqli_rollback($conexion);
    cerrarConexion();
    $msg = $e->getMessage();
    if(strpos($msg, 'SEAT_TAKEN:') === 0){
        $asiento = substr($msg, strlen('SEAT_TAKEN:'));
        error_log('[Acajutla Airlines] Intento de reservar asiento ya ocupado: ' . $asiento);
        responderError('El asiento ' . $asiento . ' ya fue reservado por otro pasajero. Selecciona otro asiento.', 409);
    }
    error_log('[Acajutla Airlines] Error al crear reserva: ' . $msg);
    responderError('No se pudo completar la reserva. Intenta nuevamente.', 500);
}