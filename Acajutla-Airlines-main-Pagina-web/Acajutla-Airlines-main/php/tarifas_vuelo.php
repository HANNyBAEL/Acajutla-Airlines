<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — php/tarifas_vuelo.php
 *
 * Lógica REUTILIZABLE (no un script aislado) para mantener flight_fares
 * coherente con fare_classes y flights.base_price, sin hardcodear
 * multiplicadores ni IDs de clase — todo se lee de fare_classes.
 *
 * Se puede usar de 3 formas:
 *
 *   1) Incluido desde otro PHP (por ejemplo, un futuro endpoint que haga
 *      INSERT INTO flights):
 *        require_once __DIR__ . '/tarifas_vuelo.php';
 *        generarTarifasVuelo($conexion, $flightId);
 *
 *   2) Por línea de comandos, justo después de insertar un vuelo por SQL:
 *        php php/tarifas_vuelo.php 42
 *
 *   3) Por HTTP (POST flight_id=42) si se quiere disparar manualmente
 *      tras crear un vuelo en Aiven sin acceso a consola:
 *        POST php/tarifas_vuelo.php  { "flight_id": 42 }
 *
 * REGLA (idéntica en todos los casos, sin duplicar lógica):
 *   flight_fares.price = flights.base_price * fare_classes.multiplier
 *   para CADA fare_classes.active = 1, sin importar cuántas existan ni
 *   qué multiplicador tengan — nada de esto está hardcodeado.
 *
 * COMPORTAMIENTO:
 *   - generarTarifasVuelo(): crea las filas de flight_fares que falten
 *     para ese vuelo (una por cada fare_class activa). Si ya existe una
 *     fila para flight_id+fare_class_id, NO la duplica (regla 7) ni la
 *     toca — usa exactamente el patrón "insertar solo lo que falta".
 *   - sincronizarTarifasVuelo(): además de crear lo que falte, actualiza
 *     el price de las filas EXISTENTES cuyo seats_sold sea 0 (o NULL) —
 *     es decir, tarifas que todavía no tuvieron ninguna venta — para que
 *     sigan siendo coherentes si se edita flights.base_price (regla 5).
 *     Las filas con seats_sold > 0 NUNCA se tocan (regla 6: no alterar
 *     precios de tarifas con ventas/reservas ya asociadas).
 *   - Todo ocurre dentro de una transacción (regla 8): si algo falla a
 *     mitad de camino, no quedan tarifas a medio crear.
 *
 * NOTA sobre columnas no cubiertas por la regla de negocio dada:
 *   - seats_allocated: no se especificó ninguna fórmula para calcularlo
 *     (dependería de la capacidad de la aeronave, dato que no se pidió
 *     usar aquí), así que se deja en 0 y NO se inventa un reparto. Si
 *     hace falta, dime la regla exacta y la agrego en una tarea aparte.
 *   - active_fare_key: no se especificó su definición/regla de generación
 *     real (podría ser una columna generada por MySQL). Este código NO
 *     la escribe explícitamente — se deja que la BD la maneje sola si es
 *     una columna generada, o quedará NULL si es una columna normal sin
 *     valor por defecto. No se inventó su lógica.
 * =====================================================================
 */

require_once __DIR__ . '/conexion.php';

/**
 * Crea en flight_fares las tarifas que falten para $flightId, una por
 * cada fare_classes.active=1, calculando price = base_price * multiplier.
 * No duplica filas existentes (flight_id + fare_class_id). No toca filas
 * ya existentes (para eso está sincronizarTarifasVuelo()).
 *
 * @return array{creadas:int, ya_existian:int} conteo de lo realizado
 * @throws Exception si el vuelo no existe o falla la BD
 */
function generarTarifasVuelo($conexion, $flightId){
    return _procesarTarifasVuelo($conexion, $flightId, false);
}

/**
 * Igual que generarTarifasVuelo(), pero además actualiza el price de las
 * filas existentes cuyo seats_sold sea 0/NULL (sin ventas todavía), para
 * mantenerlas coherentes si cambió flights.base_price. Las filas con
 * ventas (seats_sold > 0) nunca se modifican.
 *
 * @return array{creadas:int, actualizadas:int, ya_existian:int}
 * @throws Exception si el vuelo no existe o falla la BD
 */
function sincronizarTarifasVuelo($conexion, $flightId){
    return _procesarTarifasVuelo($conexion, $flightId, true);
}

function _procesarTarifasVuelo($conexion, $flightId, $sincronizarExistentes){
    $flightId = (int)$flightId;

    mysqli_begin_transaction($conexion);
    try{
        // 1) Bloquear la fila real del vuelo (misma técnica ya usada en
        //    crear_reserva.php: FOR UPDATE sobre la PK real de flights).
        $stmtVuelo = mysqli_prepare($conexion, "SELECT base_price FROM flights WHERE id = ? FOR UPDATE");
        if(!$stmtVuelo) throw new Exception('No se pudo preparar la lectura del vuelo: ' . mysqli_error($conexion));
        mysqli_stmt_bind_param($stmtVuelo, 'i', $flightId);
        if(!mysqli_stmt_execute($stmtVuelo)) throw new Exception('No se pudo leer el vuelo: ' . mysqli_stmt_error($stmtVuelo));
        $resVuelo = mysqli_stmt_get_result($stmtVuelo);
        $filaVuelo = $resVuelo ? mysqli_fetch_assoc($resVuelo) : null;
        if($resVuelo) mysqli_free_result($resVuelo);
        mysqli_stmt_close($stmtVuelo);
        if(!$filaVuelo){
            throw new Exception('El vuelo ' . $flightId . ' no existe.');
        }
        $basePrice = (float)$filaVuelo['base_price'];

        // 2) Leer TODAS las clases activas — nunca hardcodeadas, ni sus
        //    IDs ni sus multiplicadores. Si mañana se agrega una clase
        //    nueva activa, esta consulta ya la incluye automáticamente.
        $clases = [];
        $resClases = mysqli_query($conexion, "SELECT id, multiplier FROM fare_classes WHERE active = 1");
        if(!$resClases) throw new Exception('No se pudieron leer las clases de tarifa: ' . mysqli_error($conexion));
        while($fila = mysqli_fetch_assoc($resClases)){
            $clases[] = ['id' => (int)$fila['id'], 'multiplier' => (float)$fila['multiplier']];
        }
        mysqli_free_result($resClases);

        // 3) Leer qué flight_fares ya existen para este vuelo (para no
        //    duplicar, regla 7), junto con su seats_sold.
        $existentes = []; // fare_class_id => ['id'=>.., 'seats_sold'=>..]
        $stmtExist = mysqli_prepare($conexion, "SELECT id, fare_class_id, seats_sold FROM flight_fares WHERE flight_id = ? FOR UPDATE");
        if(!$stmtExist) throw new Exception('No se pudo preparar la lectura de tarifas existentes: ' . mysqli_error($conexion));
        mysqli_stmt_bind_param($stmtExist, 'i', $flightId);
        if(!mysqli_stmt_execute($stmtExist)) throw new Exception('No se pudieron leer las tarifas existentes: ' . mysqli_stmt_error($stmtExist));
        $resExist = mysqli_stmt_get_result($stmtExist);
        while($fila = mysqli_fetch_assoc($resExist)){
            $existentes[(int)$fila['fare_class_id']] = ['id' => (int)$fila['id'], 'seats_sold' => (int)($fila['seats_sold'] ?? 0)];
        }
        if($resExist) mysqli_free_result($resExist);
        mysqli_stmt_close($stmtExist);

        $creadas = 0;
        $actualizadas = 0;
        $yaExistian = 0;

        $stmtInsert = mysqli_prepare($conexion,
            "INSERT INTO flight_fares (flight_id, fare_class_id, price, seats_allocated, seats_sold, active)
             VALUES (?, ?, ?, 0, 0, 1)"
        );
        if(!$stmtInsert) throw new Exception('No se pudo preparar la inserción de tarifas: ' . mysqli_error($conexion));

        $stmtUpdate = mysqli_prepare($conexion, "UPDATE flight_fares SET price = ? WHERE id = ?");
        if(!$stmtUpdate) throw new Exception('No se pudo preparar la actualización de tarifas: ' . mysqli_error($conexion));

        foreach($clases as $clase){
            $precio = round($basePrice * $clase['multiplier'], 2);

            if(isset($existentes[$clase['id']])){
                $yaExistian++;
                $fila = $existentes[$clase['id']];
                // Regla 5 y 6: solo se resincroniza si no hay ventas asociadas.
                if($sincronizarExistentes && $fila['seats_sold'] === 0){
                    mysqli_stmt_bind_param($stmtUpdate, 'di', $precio, $fila['id']);
                    if(!mysqli_stmt_execute($stmtUpdate)){
                        throw new Exception('No se pudo actualizar la tarifa ' . $fila['id'] . ': ' . mysqli_stmt_error($stmtUpdate));
                    }
                    $actualizadas++;
                }
                continue;
            }

            mysqli_stmt_bind_param($stmtInsert, 'iid', $flightId, $clase['id'], $precio);
            if(!mysqli_stmt_execute($stmtInsert)){
                throw new Exception('No se pudo insertar la tarifa para fare_class ' . $clase['id'] . ': ' . mysqli_stmt_error($stmtInsert));
            }
            $creadas++;
        }

        mysqli_stmt_close($stmtInsert);
        mysqli_stmt_close($stmtUpdate);

        mysqli_commit($conexion);

        return ['creadas' => $creadas, 'actualizadas' => $actualizadas, 'ya_existian' => $yaExistian];

    } catch(Exception $e){
        mysqli_rollback($conexion);
        throw $e;
    }
}

// -----------------------------------------------------------------------
// Entrada CLI / HTTP (solo si este archivo se ejecuta directamente, no
// cuando se hace require_once desde otro PHP).
// -----------------------------------------------------------------------
$esCli = (php_sapi_name() === 'cli');
$esAccesoDirectoHttp = !$esCli
    && isset($_SERVER['SCRIPT_FILENAME'])
    && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__;

if($esCli){
    global $argv;
    if(!isset($argv[1]) || !ctype_digit($argv[1])){
        fwrite(STDERR, "Uso: php tarifas_vuelo.php <flight_id> [--sync]\n");
        exit(1);
    }
    $flightIdCli = (int)$argv[1];
    $sync = in_array('--sync', $argv, true);
    if(!CONEXION_OK){
        fwrite(STDERR, "No se pudo conectar con la base de datos.\n");
        exit(1);
    }
    try{
        $resultado = $sync ? sincronizarTarifasVuelo($conexion, $flightIdCli) : generarTarifasVuelo($conexion, $flightIdCli);
        echo "OK — vuelo {$flightIdCli}: " . json_encode($resultado, JSON_UNESCAPED_UNICODE) . "\n";
    } catch(Exception $e){
        fwrite(STDERR, "Error: " . $e->getMessage() . "\n");
        cerrarConexion();
        exit(1);
    }
    cerrarConexion();
    exit(0);
}

if($esAccesoDirectoHttp){
    header('Content-Type: application/json; charset=utf-8');

    if($_SERVER['REQUEST_METHOD'] !== 'POST'){
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Método no permitido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if(!CONEXION_OK){
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'No se pudo conectar con la base de datos.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $raw = file_get_contents('php://input');
    $body = json_decode((string)$raw, true);
    $flightIdHttp = isset($body['flight_id']) ? $body['flight_id'] : ($_POST['flight_id'] ?? null);
    $sync = !empty($body['sync']) || !empty($_POST['sync']);

    if(!ctype_digit((string)$flightIdHttp)){
        cerrarConexion();
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'flight_id inválido.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    try{
        $resultado = $sync
            ? sincronizarTarifasVuelo($conexion, (int)$flightIdHttp)
            : generarTarifasVuelo($conexion, (int)$flightIdHttp);
        cerrarConexion();
        http_response_code(200);
        echo json_encode(['ok' => true, 'data' => $resultado], JSON_UNESCAPED_UNICODE);
    } catch(Exception $e){
        error_log('[Acajutla Airlines] Error al generar/sincronizar tarifas: ' . $e->getMessage());
        cerrarConexion();
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'No se pudieron generar las tarifas del vuelo.'], JSON_UNESCAPED_UNICODE);
    }
}
