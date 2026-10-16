<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'admin_auth.php';

startAdminSession();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $adminCount = (int) databaseConnection()->query('SELECT COUNT(*) FROM administrador')->fetchColumn();
        $role = $_SESSION['role'] ?? null;
        $redirects = [
            'administrador' => 'panel_admin.html',
            'alumno' => 'panel_alumno.html',
            'encargado' => 'panel_encargado.html',
            'docente' => 'panel_docente.html',
        ];
        $authenticated = is_string($role) && isset($redirects[$role]);
        jsonResponse([
            'setupRequired' => $adminCount === 0,
            'authenticated' => $authenticated,
            'role' => $authenticated ? $role : null,
            'redirect' => $authenticated ? $redirects[$role] : null,
            'csrfToken' => $authenticated ? ($_SESSION['csrf_token'] ?? null) : null,
        ]);
    } catch (PDOException $exception) {
        error_log('No se pudo comprobar la sesión del administrador: ' . $exception->getMessage());
        jsonResponse(['error' => 'No se pudo consultar la base de datos.'], 500);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}

$action = $_POST['action'] ?? 'login';
if ($action === 'logout') {
    if (!in_array($_SESSION['role'] ?? null, ['administrador', 'alumno', 'encargado', 'docente'], true)) {
        jsonResponse(['error' => 'No hay una sesión activa.'], 401);
    }
    requireAdminCsrfToken();
    $_SESSION = [];
    session_destroy();
    jsonResponse(['message' => 'Sesión cerrada.']);
}

$role = $_POST['role'] ?? null;
$identifier = trim((string) ($_POST['identifier'] ?? ''));
$pin = $_POST['pin'] ?? null;
if (!is_string($role) || !in_array($role, ['administrador', 'alumno', 'encargado', 'docente'], true) || !is_string($pin) || $pin === '' || strlen($pin) > 128) {
    jsonResponse(['error' => 'Selecciona el tipo de cuenta e ingresa tu identificador y PIN.'], 422);
}

$queries = [
    'administrador' => [
        'sql' => "SELECT dui_admin AS identifier, nombre, apellido, pin_acceso
                  FROM administrador
                  WHERE correo = :identifier AND estado = 'ACTIVO'
                  LIMIT 1",
        'field' => 'email',
        'redirect' => 'panel_admin.html',
    ],
    'alumno' => [
        'sql' => 'SELECT CAST(nie_alumno AS CHAR) AS identifier, nombre, apellido, pin_acceso
                  FROM alumno
                  WHERE correo_institucional = :identifier
                  LIMIT 1',
        'field' => 'email',
        'redirect' => 'panel_alumno.html',
    ],
    'encargado' => [
        'sql' => "SELECT dui_encargado AS identifier, nombre, apellido, pin_acceso
                  FROM encargado
                  WHERE REPLACE(dui_encargado, '-', '') = :identifier
                  LIMIT 1",
        'field' => 'dui',
        'redirect' => 'panel_encargado.html',
    ],
    'docente' => [
        'sql' => "SELECT dui_docente AS identifier, nombre, apellido, pin_acceso
                  FROM docente
                  WHERE correo = :identifier AND estado = 'ACTIVO'
                  LIMIT 1",
        'field' => 'email',
        'redirect' => 'panel_docente.html',
    ],
];

if ($queries[$role]['field'] === 'email') {
    $identifier = filter_var($identifier, FILTER_VALIDATE_EMAIL);
    if ($identifier === false) {
        jsonResponse(['error' => 'Ingresa un correo válido.'], 422);
    }
} else {
    if (!preg_match('/^[0-9]{8}-?[0-9]$/', $identifier)) {
        jsonResponse(['error' => 'Ingresa un DUI válido.'], 422);
    }
    $identifier = str_replace('-', '', $identifier);
}

try {
    $statement = databaseConnection()->prepare($queries[$role]['sql']);
    $statement->execute(['identifier' => $identifier]);
    $account = $statement->fetch();

    if (!$account || !password_verify($pin, $account['pin_acceso'])) {
        jsonResponse(['error' => 'El identificador o el PIN no son correctos.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['role'] = $role;
    $_SESSION['account_id'] = $account['identifier'];
    if ($role === 'administrador') {
        $_SESSION['dui_admin'] = $account['identifier'];
    }
    $_SESSION['account_name'] = trim($account['nombre'] . ' ' . $account['apellido']);
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    jsonResponse([
        'message' => 'Inicio de sesión correcto.',
        'role' => $role,
        'redirect' => $queries[$role]['redirect'],
    ]);
} catch (PDOException $exception) {
    error_log('No se pudo autenticar la cuenta: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo consultar la base de datos.'], 500);
}
