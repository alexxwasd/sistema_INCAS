<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'admin_auth.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}
requireAdminCsrfToken();

$payload = json_decode(file_get_contents('php://input'), true);
$dui = is_array($payload) && is_string($payload['dui'] ?? null)
    ? trim($payload['dui'])
    : '';
if (!preg_match('/^[0-9]{8}-?[0-9]$/', $dui)) {
    jsonResponse(['error' => 'El DUI del encargado no es válido.'], 422);
}
$dui = preg_replace('/^([0-9]{8})-?([0-9])$/', '$1-$2', $dui);
$temporaryPin = (string) random_int(10000000, 99999999);

try {
    $pdo = databaseConnection();
    $pdo->beginTransaction();
    $lookup = $pdo->prepare(
        "SELECT dui_encargado FROM encargado
         WHERE REPLACE(dui_encargado, '-', '') = :dui
         LIMIT 2 FOR UPDATE"
    );
    $lookup->execute(['dui' => str_replace('-', '', $dui)]);
    $matchingDuis = $lookup->fetchAll(PDO::FETCH_COLUMN);
    if (count($matchingDuis) !== 1) {
        $pdo->rollBack();
        if (count($matchingDuis) > 1) {
            jsonResponse(['error' => 'Hay más de un perfil con ese DUI. Corrige los datos duplicados antes de restablecer el PIN.'], 409);
        }
        jsonResponse(['error' => 'No se encontró el perfil del encargado. Actualiza la lista e inténtalo de nuevo.'], 404);
    }

    $update = $pdo->prepare(
        'UPDATE encargado
         SET pin_acceso = :pin, pin_temporal = 1
         WHERE dui_encargado = :dui'
    );
    $update->execute([
        'pin' => password_hash($temporaryPin, PASSWORD_DEFAULT),
        'dui' => $matchingDuis[0],
    ]);
    $pdo->commit();

    jsonResponse([
        'message' => 'Se generó un PIN temporal nuevo. El PIN anterior ya no funciona.',
        'dui' => $matchingDuis[0],
        'pin_temporal' => $temporaryPin,
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('No se pudo restablecer el PIN del encargado: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo generar el PIN temporal. Inténtalo de nuevo.'], 500);
}
