<?php
declare(strict_types=1);

// Descarga la guía de conexión como archivo Markdown, sin exponer rutas arbitrarias.
$guidePath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'GUIA_BASE_DATOS.md';

if (!is_file($guidePath) || !is_readable($guidePath)) {
    error_log('No se pudo leer la guía de conexión de la base de datos.');
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'La guía no está disponible.';
    exit;
}

header('Content-Type: text/markdown; charset=utf-8');
header('Content-Disposition: attachment; filename="GUIA_BASE_DATOS.md"');
header('Content-Length: ' . (string) filesize($guidePath));
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (readfile($guidePath) === false) {
    error_log('No se pudo enviar la guía de conexión de la base de datos.');
}
