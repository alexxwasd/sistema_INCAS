<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}

$name = trim((string) ($_POST['nombre'] ?? ''));
$surname = trim((string) ($_POST['apellido'] ?? ''));
$dui = trim((string) ($_POST['dui'] ?? ''));
$email = filter_var(trim((string) ($_POST['correo'] ?? '')), FILTER_VALIDATE_EMAIL);
$pin = $_POST['pin'] ?? null;
$confirmation = $_POST['confirmar_pin'] ?? null;

if (
    $name === '' || mb_strlen($name) > 50
    || $surname === '' || mb_strlen($surname) > 50
    || !preg_match('/^[0-9]{8}-?[0-9]$/', $dui)
    || $email === false
    || !is_string($pin) || !preg_match('/^[0-9]{6,12}$/', $pin)
    || !is_string($confirmation) || !hash_equals($pin, $confirmation)
) {
    jsonResponse(['error' => 'Revisa el nombre, apellido, DUI, correo y PIN.'], 422);
}

$dui = preg_replace('/^([0-9]{8})-?([0-9])$/', '$1-$2', $dui);
$pdo = null;
$lockAcquired = false;

try {
    $pdo = databaseConnection();
    $lockAcquired = (int) $pdo->query("SELECT GET_LOCK('incas_first_admin_setup', 5)")->fetchColumn() === 1;
    if (!$lockAcquired) {
        jsonResponse(['error' => 'No se pudo iniciar la configuración. Inténtalo de nuevo.'], 503);
    }

    $adminCount = (int) $pdo->query('SELECT COUNT(*) FROM administrador')->fetchColumn();
    if ($adminCount > 0) {
        $pdo->query("SELECT RELEASE_LOCK('incas_first_admin_setup')");
        jsonResponse(['error' => 'La configuración inicial ya se completó. Inicia sesión con la cuenta administradora.'], 409);
    }

    $statement = $pdo->prepare(
        'INSERT INTO administrador (dui_admin, nombre, apellido, correo, pin_acceso, pin_temporal, estado)
         VALUES (:dui, :nombre, :apellido, :correo, :pin, 0, \'ACTIVO\')'
    );
    $statement->execute([
        'dui' => $dui,
        'nombre' => $name,
        'apellido' => $surname,
        'correo' => $email,
        'pin' => password_hash($pin, PASSWORD_DEFAULT),
    ]);
    $pdo->query("SELECT RELEASE_LOCK('incas_first_admin_setup')");
    jsonResponse(['message' => 'La cuenta administradora se creó correctamente.'], 201);
} catch (PDOException $exception) {
    if ($lockAcquired && $pdo instanceof PDO) {
        $pdo->query("SELECT RELEASE_LOCK('incas_first_admin_setup')");
    }
    if ($exception->getCode() === '23000') {
        jsonResponse(['error' => 'El DUI o correo ya está registrado.'], 409);
    }
    error_log('No se pudo crear el administrador inicial: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo crear la cuenta administradora.'], 500);
}
