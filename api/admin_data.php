<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'admin_auth.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}

try {
    $pdo = databaseConnection();
    $pending = $pdo->query(
        "SELECT id, nombre_est, apellido_est, fecha_nac_est, correo_est, telefono_est,
                direccion_est, tipo_bachillerato, id_especialidad, nombre_rep,
                apellido_rep, dui_rep, telefono_rep, ruta_partida, ruta_notas, ruta_carta,
                fecha_registro
         FROM matriculas
         WHERE estado = 'Pendiente'
         ORDER BY fecha_registro, id"
    )->fetchAll();
    $teachers = $pdo->query(
        "SELECT d.dui_docente AS dui, d.nombre, d.apellido, d.correo, d.telefono, d.estado,
                GROUP_CONCAT(DISTINCT s.nombre_seccion ORDER BY s.nombre_seccion SEPARATOR ', ') AS secciones
         FROM docente AS d
         LEFT JOIN asignacion_docente AS ad ON ad.dui_docente = d.dui_docente
         LEFT JOIN secciones AS s ON s.id_seccion = ad.id_seccion
         GROUP BY d.dui_docente, d.nombre, d.apellido, d.correo, d.telefono, d.estado
         ORDER BY d.apellido, d.nombre"
    )->fetchAll();
    $guardians = $pdo->query(
        "SELECT g.dui_encargado AS dui, g.nombre, g.apellido, g.telefono,
                GROUP_CONCAT(
                    DISTINCT CONCAT(a.nombre, ' ', a.apellido)
                    ORDER BY a.apellido, a.nombre SEPARATOR ', '
                ) AS alumnos
         FROM encargado AS g
         LEFT JOIN alumno AS a
           ON REPLACE(a.dui_encargado, '-', '') = REPLACE(g.dui_encargado, '-', '')
         GROUP BY g.dui_encargado, g.nombre, g.apellido, g.telefono
         ORDER BY g.apellido, g.nombre"
    )->fetchAll();
    $sections = $pdo->query(
        'SELECT s.id_seccion AS id, s.nombre_seccion AS nombre,
                e.id_especialidad, e.nombre_especialidad AS especialidad,
                s.dui_docente_guia AS guia_dui,
                CONCAT(d.nombre, \' \', d.apellido) AS guia_nombre
         FROM secciones AS s
         INNER JOIN especialidades AS e ON e.id_especialidad = s.id_especialidad
         LEFT JOIN docente AS d ON d.dui_docente = s.dui_docente_guia
         ORDER BY s.nombre_seccion'
    )->fetchAll();

    foreach ($pending as &$application) {
        $application['id'] = (int) $application['id'];
        $application['id_especialidad'] = $application['id_especialidad'] === null
            ? null
            : (int) $application['id_especialidad'];
    }
    unset($application);

    jsonResponse([
        'applications' => $pending,
        'teachers' => $teachers,
        'guardians' => $guardians,
        'sections' => $sections,
    ]);
} catch (PDOException $exception) {
    error_log('No se pudieron cargar los datos del panel administrativo: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudieron cargar las solicitudes y los catálogos.'], 500);
}
