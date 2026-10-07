<?php
/**
 * =====================================================================
 * ACAJUTLA AIRLINES — api.php
 * Endpoint REST mínimo.
 *
 * Acciones disponibles:
 *   - aeropuertos
 *   - buscar_vuelos
 *
 * Los vuelos, aeropuertos, aeronaves y tarifas se consultan
 * directamente desde MySQL (Aiven).
 *
 * IMPORTANTE:
 * El frontend NUNCA se conecta directamente a MySQL.
 * =====================================================================
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// -----------------------------------------------------------------------
// CORS básico
// -----------------------------------------------------------------------
$origenPermitido = 'http://localhost';

if(isset($_SERVER['HTTP_ORIGIN']) && strpos($_SERVER['HTTP_ORIGIN'], 'localhost') !== false){
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
} else {
    header('Access-Control-Allow-Origin: ' . $origenPermitido);
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Responder rápido a preflight CORS.
if($_SERVER['REQUEST_METHOD'] === 'OPTIONS'){
    http_response_code(204);
    exit;
}

/**
 * Envía una respuesta JSON estándar y termina la ejecución.
 */
function responderJSON($payload, $codigoHttp = 200){
    http_response_code($codigoHttp);

    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    exit;
}


// =======================================================================
// ROUTER PRINCIPAL
// =======================================================================

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch($action){

    case 'aeropuertos':
        manejarAeropuertos();
        break;

    case 'buscar_vuelos':
        manejarBuscarVuelos();
        break;

    default:
        responderJSON([
            'ok' => false,
            'error' => 'Acción no reconocida.'
        ], 400);
}


// =======================================================================
// AEROPUERTOS
// =======================================================================

/**
 * GET:
 * api.php?action=aeropuertos
 *
 * Devuelve los aeropuertos activos directamente desde MySQL.
 */
function manejarAeropuertos(){

    $conexion = obtenerConexionDB();

    if(!$conexion){
        responderJSON([
            'ok' => false,
            'error' => 'No se pudo conectar con la base de datos.'
        ], 500);
    }

    $sql = "SELECT
                id,
                codigo_iata,
                codigo_icao,
                nombre,
                ciudad,
                codigo_pais,
                zona_horaria,
                activo
            FROM aeropuertos
            WHERE activo = 1
            ORDER BY ciudad ASC, nombre ASC";

    $resultado = mysqli_query($conexion, $sql);

    if(!$resultado){

        registrarErrorInterno(
            'Error en consulta de aeropuertos: ' . mysqli_error($conexion)
        );

        mysqli_close($conexion);

        responderJSON([
            'ok' => false,
            'error' => 'No se pudo consultar la información solicitada.'
        ], 500);
    }

    $aeropuertos = [];

    while($fila = mysqli_fetch_assoc($resultado)){

        $aeropuertos[] = [
            'id'            => (int)$fila['id'],
            'codigo_iata'   => $fila['codigo_iata'],
            'codigo_icao'   => $fila['codigo_icao'],
            'nombre'        => $fila['nombre'],
            'ciudad'        => $fila['ciudad'],
            'codigo_pais'   => $fila['codigo_pais'],
            'zona_horaria'  => $fila['zona_horaria'],
            'activo'        => (int)$fila['activo']
        ];
    }

    mysqli_free_result($resultado);
    mysqli_close($conexion);

    responderJSON([
        'ok' => true,
        'data' => $aeropuertos
    ], 200);
}


// =======================================================================
// BUSCAR VUELOS
// =======================================================================

/**
 * GET:
 *
 * api.php?action=buscar_vuelos
 *     &origen=<id>
 *     &destino=<id>
 *     &fecha=YYYY-MM-DD
 *
 * Devuelve:
 *   - información del vuelo
 *   - ruta
 *   - aeropuertos
 *   - aeronave
 *   - tarifas reales desde tarifas_vuelo
 *
 * IMPORTANTE:
 * Los precios NO se inventan ni se calculan en PHP.
 * Se obtienen directamente de la tabla tarifas_vuelo.
 */
function manejarBuscarVuelos(){

    $origenId  = isset($_GET['origen'])  ? $_GET['origen']  : '';
    $destinoId = isset($_GET['destino']) ? $_GET['destino'] : '';
    $fecha     = isset($_GET['fecha'])   ? $_GET['fecha']   : '';


    // -------------------------------------------------------------------
    // VALIDACIÓN DE PARÁMETROS
    // -------------------------------------------------------------------

    if(
        !ctype_digit((string)$origenId) ||
        !ctype_digit((string)$destinoId)
    ){

        responderJSON([
            'ok' => false,
            'error' => 'Origen y destino deben ser identificadores de aeropuerto válidos.'
        ], 400);
    }


    if(!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)){

        responderJSON([
            'ok' => false,
            'error' => 'La fecha debe tener el formato YYYY-MM-DD.'
        ], 400);
    }


    // -------------------------------------------------------------------
    // CONEXIÓN
    // -------------------------------------------------------------------

    $conexion = obtenerConexionDB();

    if(!$conexion){

        responderJSON([
            'ok' => false,
            'error' => 'No se pudo conectar con la base de datos.'
        ], 500);
    }


    // -------------------------------------------------------------------
    // CONSULTA PRINCIPAL
    //
    // Las tarifas se unen tres veces:
    //
    // tv_e = ECONOMICA
    // tv_s = ESTANDAR
    // tv_p = PREMIUM
    //
    // Esto permite que cada vuelo tenga sus tres precios en la
    // respuesta JSON.
    // -------------------------------------------------------------------

    $sql = "SELECT

                -- =====================================================
                -- VUELO
                -- =====================================================

                v.id,
                v.numero_vuelo,
                v.ruta_id,
                v.aeronave_id,
                v.salida_programada,
                v.llegada_programada,
                v.salida_real,
                v.llegada_real,
                v.estado,
                v.puerta,
                v.terminal,


                -- =====================================================
                -- RUTA
                -- =====================================================

                r.distancia_km,
                r.duracion_estimada_minutos,
                r.es_estacional,


                -- =====================================================
                -- AEROPUERTO ORIGEN
                -- =====================================================

                ao.id AS origen_id,
                ao.codigo_iata AS origen_iata,
                ao.codigo_icao AS origen_icao,
                ao.nombre AS origen_nombre,
                ao.ciudad AS origen_ciudad,
                ao.codigo_pais AS origen_codigo_pais,
                ao.zona_horaria AS origen_zona_horaria,


                -- =====================================================
                -- AEROPUERTO DESTINO
                -- =====================================================

                ad.id AS destino_id,
                ad.codigo_iata AS destino_iata,
                ad.codigo_icao AS destino_icao,
                ad.nombre AS destino_nombre,
                ad.ciudad AS destino_ciudad,
                ad.codigo_pais AS destino_codigo_pais,
                ad.zona_horaria AS destino_zona_horaria,


                -- =====================================================
                -- AERONAVE
                -- =====================================================

                a.id AS aeronave_id_real,
                a.matricula,
                a.numero_serie,
                a.tipo_aeronave_id,
                a.estado AS aeronave_estado,


                -- =====================================================
                -- TIPO DE AERONAVE
                -- =====================================================

                ta.fabricante,
                ta.modelo,
                ta.capacidad_total,
                ta.configuracion_asientos,
                ta.alcance_km,


                -- =====================================================
                -- TARIFA ECONÓMICA
                -- =====================================================

                tv_e.precio AS precio_economica,
                tv_e.moneda AS moneda_economica,


                -- =====================================================
                -- TARIFA ESTÁNDAR
                -- =====================================================

                tv_s.precio AS precio_estandar,
                tv_s.moneda AS moneda_estandar,


                -- =====================================================
                -- TARIFA PREMIUM
                -- =====================================================

                tv_p.precio AS precio_premium,
                tv_p.moneda AS moneda_premium


            FROM vuelos v


            -- =========================================================
            -- RUTA
            -- =========================================================

            INNER JOIN rutas r
                ON v.ruta_id = r.id


            -- =========================================================
            -- AEROPUERTO ORIGEN
            -- =========================================================

            INNER JOIN aeropuertos ao
                ON r.aeropuerto_origen_id = ao.id


            -- =========================================================
            -- AEROPUERTO DESTINO
            -- =========================================================

            INNER JOIN aeropuertos ad
                ON r.aeropuerto_destino_id = ad.id


            -- =========================================================
            -- AERONAVE
            -- =========================================================

            LEFT JOIN aeronaves a
                ON v.aeronave_id = a.id


            -- =========================================================
            -- TIPO DE AERONAVE
            -- =========================================================

            LEFT JOIN tipos_aeronave ta
                ON a.tipo_aeronave_id = ta.id


            -- =========================================================
            -- TARIFA ECONÓMICA
            -- =========================================================

            LEFT JOIN tarifas_vuelo tv_e
                ON tv_e.vuelo_id = v.id
               AND tv_e.clase = 'ECONOMICA'
               AND tv_e.activo = 1


            -- =========================================================
            -- TARIFA ESTÁNDAR
            -- =========================================================

            LEFT JOIN tarifas_vuelo tv_s
                ON tv_s.vuelo_id = v.id
               AND tv_s.clase = 'ESTANDAR'
               AND tv_s.activo = 1


            -- =========================================================
            -- TARIFA PREMIUM
            -- =========================================================

            LEFT JOIN tarifas_vuelo tv_p
                ON tv_p.vuelo_id = v.id
               AND tv_p.clase = 'PREMIUM'
               AND tv_p.activo = 1


            -- =========================================================
            -- FILTROS
            -- =========================================================

            WHERE ao.id = ?
              AND ad.id = ?
              AND DATE(v.salida_programada) = ?
              AND v.estado <> 'CANCELADO'


            -- =========================================================
            -- ORDEN
            -- =========================================================

            ORDER BY v.salida_programada ASC";


    // -------------------------------------------------------------------
    // PREPARAR CONSULTA
    // -------------------------------------------------------------------

    $stmt = mysqli_prepare($conexion, $sql);

    if(!$stmt){

        registrarErrorInterno(
            'Error al preparar consulta de vuelos: ' .
            mysqli_error($conexion)
        );

        mysqli_close($conexion);

        responderJSON([
            'ok' => false,
            'error' => 'No se pudo consultar la información solicitada.'
        ], 500);
    }


    // -------------------------------------------------------------------
    // PARÁMETROS
    // -------------------------------------------------------------------

    $origenIdInt  = (int)$origenId;
    $destinoIdInt = (int)$destinoId;


    mysqli_stmt_bind_param(
        $stmt,
        'iis',
        $origenIdInt,
        $destinoIdInt,
        $fecha
    );


    // -------------------------------------------------------------------
    // EJECUTAR
    // -------------------------------------------------------------------

    if(!mysqli_stmt_execute($stmt)){

        registrarErrorInterno(
            'Error al ejecutar consulta de vuelos: ' .
            mysqli_stmt_error($stmt)
        );

        mysqli_stmt_close($stmt);
        mysqli_close($conexion);

        responderJSON([
            'ok' => false,
            'error' => 'No se pudo consultar la información solicitada.'
        ], 500);
    }


    // -------------------------------------------------------------------
    // OBTENER RESULTADOS
    // -------------------------------------------------------------------

    $resultado = mysqli_stmt_get_result($stmt);

    if(!$resultado){

        registrarErrorInterno(
            'Error al obtener resultado de vuelos: ' .
            mysqli_stmt_error($stmt)
        );

        mysqli_stmt_close($stmt);
        mysqli_close($conexion);

        responderJSON([
            'ok' => false,
            'error' => 'No se pudo procesar la información solicitada.'
        ], 500);
    }


    $vuelos = [];


    // ===================================================================
    // RECORRER VUELOS
    // ===================================================================

    while($fila = mysqli_fetch_assoc($resultado)){


        // ===============================================================
        // AERONAVE
        // ===============================================================

        $aeronave = null;


        if($fila['aeronave_id_real'] !== null){

            $configAsientos = null;


            // -----------------------------------------------------------
            // configuracion_asientos viene como JSON desde MySQL
            // -----------------------------------------------------------

            if($fila['configuracion_asientos'] !== null){

                $decodificado = json_decode(
                    $fila['configuracion_asientos'],
                    true
                );


                if(json_last_error() === JSON_ERROR_NONE){
                    $configAsientos = $decodificado;
                }
            }


            $aeronave = [

                'id' => (int)$fila['aeronave_id_real'],

                'matricula' => $fila['matricula'],

                'numero_serie' => $fila['numero_serie'],

                'tipo_aeronave_id' =>
                    $fila['tipo_aeronave_id'] !== null
                    ? (int)$fila['tipo_aeronave_id']
                    : null,

                'estado' => $fila['aeronave_estado'],

                'fabricante' => $fila['fabricante'],

                'modelo' => $fila['modelo'],

                'capacidad_total' =>
                    $fila['capacidad_total'] !== null
                    ? (int)$fila['capacidad_total']
                    : null,

                'configuracion_asientos' => $configAsientos,

                'alcance_km' =>
                    $fila['alcance_km'] !== null
                    ? (int)$fila['alcance_km']
                    : null
            ];
        }


        // ===============================================================
        // TARIFAS
        // ===============================================================

        $tarifas = [];


        // ---------------------------------------------------------------
        // ECONÓMICA
        // ---------------------------------------------------------------

        if($fila['precio_economica'] !== null){

            $tarifas[] = [

                'clase' => 'ECONOMICA',

                'precio' => (float)$fila['precio_economica'],

                'moneda' => $fila['moneda_economica']
            ];
        }


        // ---------------------------------------------------------------
        // ESTÁNDAR
        // ---------------------------------------------------------------

        if($fila['precio_estandar'] !== null){

            $tarifas[] = [

                'clase' => 'ESTANDAR',

                'precio' => (float)$fila['precio_estandar'],

                'moneda' => $fila['moneda_estandar']
            ];
        }


        // ---------------------------------------------------------------
        // PREMIUM
        // ---------------------------------------------------------------

        if($fila['precio_premium'] !== null){

            $tarifas[] = [

                'clase' => 'PREMIUM',

                'precio' => (float)$fila['precio_premium'],

                'moneda' => $fila['moneda_premium']
            ];
        }


        // ===============================================================
        // VUELO COMPLETO
        // ===============================================================

        $vuelos[] = [

            // -----------------------------------------------------------
            // Identificación
            // -----------------------------------------------------------

            'id' => (int)$fila['id'],

            'numero_vuelo' => $fila['numero_vuelo'],

            'ruta_id' => (int)$fila['ruta_id'],

            'aeronave_id' =>
                $fila['aeronave_id'] !== null
                ? (int)$fila['aeronave_id']
                : null,


            // -----------------------------------------------------------
            // Estado
            // -----------------------------------------------------------

            'estado' => $fila['estado'],


            // -----------------------------------------------------------
            // Horarios
            // -----------------------------------------------------------

            'salida_programada' => $fila['salida_programada'],

            'llegada_programada' => $fila['llegada_programada'],

            'salida_real' => $fila['salida_real'],

            'llegada_real' => $fila['llegada_real'],


            // -----------------------------------------------------------
            // Puerta / terminal
            // -----------------------------------------------------------

            'puerta' => $fila['puerta'],

            'terminal' => $fila['terminal'],


            // -----------------------------------------------------------
            // Ruta
            // -----------------------------------------------------------

            'distancia_km' =>
                $fila['distancia_km'] !== null
                ? (float)$fila['distancia_km']
                : null,

            'duracion_estimada_minutos' =>
                $fila['duracion_estimada_minutos'] !== null
                ? (int)$fila['duracion_estimada_minutos']
                : null,

            'es_estacional' =>
                (int)$fila['es_estacional'],


            // -----------------------------------------------------------
            // Aeropuerto origen
            // -----------------------------------------------------------

            'origen' => [

                'id' => (int)$fila['origen_id'],

                'codigo_iata' => $fila['origen_iata'],

                'codigo_icao' => $fila['origen_icao'],

                'nombre' => $fila['origen_nombre'],

                'ciudad' => $fila['origen_ciudad'],

                'codigo_pais' => $fila['origen_codigo_pais'],

                'zona_horaria' => $fila['origen_zona_horaria']
            ],


            // -----------------------------------------------------------
            // Aeropuerto destino
            // -----------------------------------------------------------

            'destino' => [

                'id' => (int)$fila['destino_id'],

                'codigo_iata' => $fila['destino_iata'],

                'codigo_icao' => $fila['destino_icao'],

                'nombre' => $fila['destino_nombre'],

                'ciudad' => $fila['destino_ciudad'],

                'codigo_pais' => $fila['destino_codigo_pais'],

                'zona_horaria' => $fila['destino_zona_horaria']
            ],


            // -----------------------------------------------------------
            // Aeronave
            // -----------------------------------------------------------

            'aeronave' => $aeronave,


            // -----------------------------------------------------------
            // TARIFAS REALES DESDE MYSQL
            // -----------------------------------------------------------

            'tarifas' => $tarifas
        ];
    }


    // ===================================================================
    // CERRAR
    // ===================================================================

    mysqli_free_result($resultado);

    mysqli_stmt_close($stmt);

    mysqli_close($conexion);


    // ===================================================================
    // RESPUESTA
    // ===================================================================

    responderJSON([
        'ok' => true,
        'data' => $vuelos
    ], 200);
}