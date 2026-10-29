<?php
/** Helpers de sesión para la web pública. */
function iniciarSesionWeb(){
    if(session_status() === PHP_SESSION_ACTIVE) return true;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    $httpsDirecto = !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
    $protocoloProxy = strtolower(trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    $https = $httpsDirecto || $protocoloProxy === 'https';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    return session_start();
}

/** Devuelve datos del cliente solo si hay una sesión PHP válida y activa. */
function obtenerClienteWebAutenticado($conexion){
    if(!iniciarSesionWeb()) return null;
    $userId = filter_var($_SESSION['web_user_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if(!$userId) return null;

    $stmt = mysqli_prepare($conexion,
        "SELECT c.id, c.first_names, c.last_names, c.email, c.phone, c.document_number
         FROM users u
         INNER JOIN customers c ON c.id = u.customer_id
         WHERE u.id = ? AND u.role = 'customer' AND u.status = 'active' AND c.status = 'active'
         LIMIT 1"
    );
    if(!$stmt) return null;
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    if(!mysqli_stmt_execute($stmt)){
        mysqli_stmt_close($stmt);
        return null;
    }
    $result = mysqli_stmt_get_result($stmt);
    $row = $result ? mysqli_fetch_assoc($result) : null;
    if($result) mysqli_free_result($result);
    mysqli_stmt_close($stmt);
    if(!$row){
        $_SESSION = [];
        session_destroy();
        return null;
    }
    return [
        'id' => (int)$row['id'],
        'nombre' => $row['first_names'] ?: '',
        'apellido' => $row['last_names'] ?: '',
        'correo' => $row['email'] ?: '',
        'telefono' => $row['phone'] ?: '',
        'documento' => $row['document_number'] ?: ''
    ];
}

function establecerSesionWeb($userId){
    if(!iniciarSesionWeb()) return false;
    if(!session_regenerate_id(true)) return false;
    $_SESSION['web_user_id'] = (int)$userId;
    return true;
}
