<?php
declare(strict_types=1);

// Respuestas comunes de la API: el navegador siempre recibe JSON y no guarda resultados en caché.
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// Envía una respuesta JSON con el código HTTP indicado y termina la petición.
function jsonResponse(array $body, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Centraliza PDO para que todos los endpoints usen la misma conexión y errores explícitos.
function databaseConnection(): PDO
{
    $config = require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'private' . DIRECTORY_SEPARATOR . 'database.php';
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['name']
    );

    return new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

// Devuelve un campo obligatorio ya normalizado y limitado a su tamaño en la base.
function textField(string $name, int $maxLength): string
{
    $value = $_POST[$name] ?? null;
    if (!is_string($value)) {
        jsonResponse(['error' => 'Completa todos los campos requeridos.'], 422);
    }

    $value = trim($value);
    if ($value === '' || mb_strlen($value) > $maxLength) {
        jsonResponse(['error' => 'Revisa los campos requeridos y sus longitudes.'], 422);
    }

    return $value;
}

// Comprueba cada imagen usando MIME y contenido real; nunca confía solo en el nombre recibido.
function validateUploadedImage(string $key, string $label): array
{
    $file = $_FILES[$key] ?? null;
    if (!is_array($file) || !isset($file['error'], $file['tmp_name'], $file['size']) || is_array($file['error'])) {
        jsonResponse(['error' => "Adjunta el archivo: {$label}."], 422);
    }

    if ($file['error'] !== UPLOAD_ERR_OK) {
        $message = $file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE
            ? "El archivo de {$label} supera el tamaño permitido."
            : "No se pudo recibir el archivo de {$label}.";
        jsonResponse(['error' => $message], 422);
    }

    if ($file['size'] < 1 || $file['size'] > 5 * 1024 * 1024 || !is_uploaded_file($file['tmp_name'])) {
        jsonResponse(['error' => "El archivo de {$label} supera el límite de 5 MB o está vacío."], 422);
    }

    $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!is_string($mimeType) || !isset($extensions[$mimeType])) {
        jsonResponse(['error' => "El archivo de {$label} debe ser una imagen JPG, PNG o WebP."], 422);
    }

    $image = getimagesize($file['tmp_name']);
    if ($image === false || $image[0] > 8000 || $image[1] > 8000) {
        jsonResponse(['error' => "La imagen de {$label} no es válida o sus dimensiones son demasiado grandes."], 422);
    }

    return ['tmp_name' => $file['tmp_name'], 'extension' => $extensions[$mimeType]];
}
