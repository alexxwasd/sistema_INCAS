<?php
declare(strict_types=1);

// Configuración solo del servidor: se permiten variables de entorno y valores locales de XAMPP.
// En producción usa un usuario de base dedicado y no expongas credenciales en archivos públicos.
return [
    'host' => getenv('INCAS_DB_HOST') ?: '127.0.0.1',
    'name' => getenv('INCAS_DB_NAME') ?: 'db_matricula_incas',
    'user' => getenv('INCAS_DB_USER') ?: 'root',
    'password' => (($password = getenv('INCAS_DB_PASSWORD')) === false) ? '' : $password,
];
