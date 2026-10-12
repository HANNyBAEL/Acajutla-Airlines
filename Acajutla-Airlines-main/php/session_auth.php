<?php
/** Sesión común de la web pública. La identidad siempre se resuelve en BD. */

function iniciarSesionWeb(){
    if(session_status() === PHP_SESSION_ACTIVE) return;

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    $https = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower(trim(explode(',', (string)$_SERVER['HTTP_X_FORWARDED_PROTO'])[0])) === 'https')
        || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);
    session_name('acajutla_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

function iniciarSesionUsuarioWeb($userId, $customerId = null){
    iniciarSesionWeb();
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$userId;
    $_SESSION['customer_id'] = $customerId !== null ? (int)$customerId : null;
}

function usuarioSesionWeb($conexion){
    iniciarSesionWeb();
    $userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
    if($userId <= 0) return null;

    $stmt = mysqli_prepare($conexion, "SELECT id, customer_id, role FROM users WHERE id = ? AND status = 'active' LIMIT 1");
    if(!$stmt) return null;
    mysqli_stmt_bind_param($stmt, 'i', $userId);
    if(!mysqli_stmt_execute($stmt)){
        mysqli_stmt_close($stmt);
        return null;
    }
    $result = mysqli_stmt_get_result($stmt);
    $user = $result ? mysqli_fetch_assoc($result) : null;
    if($result) mysqli_free_result($result);
    mysqli_stmt_close($stmt);

    if(!$user){
        $_SESSION = [];
        session_destroy();
        return null;
    }

    $user['id'] = (int)$user['id'];
    $user['customer_id'] = $user['customer_id'] !== null ? (int)$user['customer_id'] : null;
    $_SESSION['customer_id'] = $user['customer_id'];
    return $user;
}

function destruirSesionWeb(){
    iniciarSesionWeb();
    $_SESSION = [];
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'] ?: '/',
        'domain' => $params['domain'],
        'secure' => $params['secure'],
        'httponly' => $params['httponly'],
        'samesite' => $params['samesite'] ?: 'Lax'
    ]);
    session_destroy();
}
