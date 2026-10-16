<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'admin_auth.php';
startAdminSession();
if (($_SESSION['role'] ?? null) !== 'alumno') {
    jsonResponse(['error' => 'Inicia sesión como alumno para consultar este perfil.'], 401);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}

try {
    $pdo = databaseConnection();
    $studentQuery = $pdo->prepare(
        'SELECT a.nie_alumno AS id, a.nombre, a.apellido, a.correo_institucional AS correo,
                a.telefono, s.nombre_seccion AS seccion
         FROM alumno AS a
         LEFT JOIN secciones AS s ON s.id_seccion = a.id_seccion
         WHERE a.nie_alumno = :nie
         LIMIT 1'
    );
    $studentQuery->execute(['nie' => $_SESSION['account_id']]);
    $student = $studentQuery->fetch();
    if (!$student) {
        jsonResponse(['error' => 'No se encontró el perfil de este alumno.'], 404);
    }

    $periods = $pdo->query(
        "SELECT id_periodo AS id, nombre_periodo AS nombre,
                (estado = 'CERRADO') AS finalizado
         FROM periodos
         ORDER BY id_periodo"
    )->fetchAll();
    $gradesQuery = $pdo->prepare(
        'SELECT n.id_periodo AS periodo_id, m.nombre_materia AS materia,
                n.promedio_periodo AS nota
         FROM notas AS n
         INNER JOIN asignacion_docente AS ad ON ad.id_asignacion = n.id_asignacion
         INNER JOIN asignaturas AS m ON m.id_asignatura = ad.id_asignatura
         WHERE n.nie_alumno = :nie
         ORDER BY n.id_periodo, m.nombre_materia'
    );
    $gradesQuery->execute(['nie' => $_SESSION['account_id']]);
    $gradesByPeriod = [];
    foreach ($gradesQuery->fetchAll() as $grade) {
        $gradesByPeriod[(string) $grade['periodo_id']][] = [
            'materia' => $grade['materia'],
            'nota' => $grade['nota'] === null ? null : (float) $grade['nota'],
        ];
    }

    foreach ($periods as &$period) {
        $period['finalizado'] = (bool) $period['finalizado'];
        $period['notas'] = $period['finalizado']
            ? ($gradesByPeriod[(string) $period['id']] ?? [])
            : [];
    }
    unset($period);

    jsonResponse(['student' => $student, 'periods' => $periods]);
} catch (PDOException $exception) {
    error_log('No se pudo cargar el portal del alumno: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo consultar la información académica.'], 500);
}
