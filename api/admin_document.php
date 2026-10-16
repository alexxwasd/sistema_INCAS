<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'admin_auth.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}

$applicationId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$document = $_GET['documento'] ?? null;
$columns = [
    'partida' => 'ruta_partida',
    'notas' => 'ruta_notas',
    'conducta' => 'ruta_carta',
];
if ($applicationId === false || !is_string($document) || !isset($columns[$document])) {
    jsonResponse(['error' => 'El documento solicitado no es válido.'], 422);
}

try {
    $statement = databaseConnection()->prepare(
        'SELECT ' . $columns[$document] . ' AS ruta
         FROM matriculas
         WHERE id = :id
         LIMIT 1'
    );
    $statement->execute(['id' => $applicationId]);
    $relativePath = $statement->fetchColumn();
    if (!is_string($relativePath) || !preg_match('#^storage/enrollment/[a-f0-9]{32}\.(jpg|png|webp)$#', $relativePath)) {
        http_response_code(404);
        exit;
    }

    $storageDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'enrollment';
    $filePath = $storageDirectory . DIRECTORY_SEPARATOR . basename($relativePath);
    if (!is_file($filePath) || !is_readable($filePath)) {
        http_response_code(404);
        exit;
    }

    $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($filePath);
    if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        http_response_code(415);
        exit;
    }

    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . (string) filesize($filePath));
    header('Content-Disposition: inline; filename="' . $document . '-' . $applicationId . '"');
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    readfile($filePath);
} catch (PDOException $exception) {
    error_log('No se pudo cargar un documento de solicitud: ' . $exception->getMessage());
    http_response_code(500);
}
