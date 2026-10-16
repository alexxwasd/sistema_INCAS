<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';

// Este recurso es de solo lectura y alimenta el selector del bachillerato Técnico.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}

try {
    // El identificador se usa en el formulario y el nombre se presenta al solicitante.
    $statement = databaseConnection()->query(
        'SELECT id_especialidad AS id, nombre_especialidad AS nombre
         FROM especialidades
         ORDER BY nombre_especialidad'
    );
    jsonResponse(['specialties' => $statement->fetchAll()]);
} catch (PDOException $exception) {
    error_log('No se pudieron consultar las especialidades: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudieron cargar las especialidades desde la base de datos.'], 500);
}
