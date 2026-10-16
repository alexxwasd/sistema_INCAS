<?php
declare(strict_types=1);

require_once __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';

// Inicia una sesión con una cookie no accesible desde JavaScript.
function startAdminSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name('INCAS_ADMIN');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// Comprueba que el navegador ya inició sesión con una cuenta administradora.
function requireAdmin(): void
{
    startAdminSession();
    if (($_SESSION['role'] ?? null) !== 'administrador' || !isset($_SESSION['dui_admin'])) {
        jsonResponse(['error' => 'Inicia sesión como administrador para continuar.'], 401);
    }
}

// Evita que otra página origine cambios administrativos con la sesión del navegador.
function requireAdminCsrfToken(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $expected = $_SESSION['csrf_token'] ?? '';
    if (!is_string($provided) || !is_string($expected) || $expected === '' || !hash_equals($expected, $provided)) {
        jsonResponse(['error' => 'La sesión venció o el formulario ya no está vigente. Recarga el panel.'], 419);
    }
}
