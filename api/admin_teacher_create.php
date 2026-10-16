<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'admin_auth.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}
requireAdminCsrfToken();

$name = trim((string) ($_POST['nombre'] ?? ''));
$surname = trim((string) ($_POST['apellido'] ?? ''));
$dui = trim((string) ($_POST['dui'] ?? ''));
$email = strtolower(trim((string) ($_POST['correo'] ?? '')));
$phone = trim((string) ($_POST['telefono'] ?? ''));
$address = trim((string) ($_POST['direccion'] ?? ''));

if (
    $name === '' || mb_strlen($name) > 50
    || $surname === '' || mb_strlen($surname) > 50
    || !preg_match('/^[0-9]{8}-?[0-9]$/', $dui)
    || filter_var($email, FILTER_VALIDATE_EMAIL) === false || mb_strlen($email) > 100
    || mb_strlen($phone) > 15 || ($phone !== '' && !preg_match('/^\+?[0-9]{7,15}$/', $phone))
    || mb_strlen($address) > 150
) {
    jsonResponse(['error' => 'Revisa el nombre, apellido, DUI, correo, teléfono y dirección.'], 422);
}

$dui = preg_replace('/^([0-9]{8})-?([0-9])$/', '$1-$2', $dui);
$temporaryPin = (string) random_int(10000000, 99999999);

try {
    $statement = databaseConnection()->prepare(
        "INSERT INTO docente (dui_docente, nombre, apellido, correo, direccion, telefono, pin_acceso, pin_temporal, estado)
         VALUES (:dui, :nombre, :apellido, :correo, :direccion, :telefono, :pin, 1, 'ACTIVO')"
    );
    $statement->execute([
        'dui' => $dui,
        'nombre' => $name,
        'apellido' => $surname,
        'correo' => $email,
        'direccion' => $address === '' ? null : $address,
        'telefono' => $phone === '' ? null : $phone,
        'pin' => password_hash($temporaryPin, PASSWORD_DEFAULT),
    ]);

    jsonResponse([
        'message' => 'El perfil docente se creó correctamente.',
        'teacher' => [
            'dui' => $dui,
            'correo' => $email,
            'pin_temporal' => $temporaryPin,
        ],
    ], 201);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000') {
        jsonResponse(['error' => 'El DUI o correo ya está registrado para otro docente.'], 409);
    }
    error_log('No se pudo crear el perfil docente: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo crear el perfil docente. Verifica la base de datos.'], 500);
}
