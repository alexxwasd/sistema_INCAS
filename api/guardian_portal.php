<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'admin_auth.php';
startAdminSession();
if (($_SESSION['role'] ?? null) !== 'encargado') {
    jsonResponse(['error' => 'Inicia sesión como encargado para consultar este perfil.'], 401);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}

try {
    $pdo = databaseConnection();
    $dui = str_replace('-', '', (string) $_SESSION['account_id']);
    $guardianQuery = $pdo->prepare(
        "SELECT dui_encargado AS dui, nombre, apellido, telefono
         FROM encargado
         WHERE REPLACE(dui_encargado, '-', '') = :dui
         LIMIT 1"
    );
    $guardianQuery->execute(['dui' => $dui]);
    $guardian = $guardianQuery->fetch();
    if (!$guardian) {
        jsonResponse(['error' => 'No se encontró el perfil de este encargado.'], 404);
    }

    $studentsQuery = $pdo->prepare(
        "SELECT a.nie_alumno AS id, a.nombre, a.apellido, a.correo_institucional AS correo,
                a.telefono, s.nombre_seccion AS seccion
         FROM alumno AS a
         LEFT JOIN secciones AS s ON s.id_seccion = a.id_seccion
         WHERE REPLACE(a.dui_encargado, '-', '') = :dui
         ORDER BY a.apellido, a.nombre"
    );
    $studentsQuery->execute(['dui' => $dui]);
    $students = $studentsQuery->fetchAll();

    $gradesQuery = $pdo->prepare(
        "SELECT n.nie_alumno AS alumno_id, n.id_periodo AS periodo_id,
                p.nombre_periodo AS periodo_nombre, p.estado AS periodo_estado,
                m.nombre_materia AS materia, n.promedio_periodo AS nota
         FROM notas AS n
         INNER JOIN alumno AS a ON a.nie_alumno = n.nie_alumno
         INNER JOIN periodos AS p ON p.id_periodo = n.id_periodo
         INNER JOIN asignacion_docente AS ad ON ad.id_asignacion = n.id_asignacion
         INNER JOIN asignaturas AS m ON m.id_asignatura = ad.id_asignatura
         WHERE REPLACE(a.dui_encargado, '-', '') = :dui
           AND p.estado = 'CERRADO'
         ORDER BY n.nie_alumno, n.id_periodo, m.nombre_materia"
    );
    $gradesQuery->execute(['dui' => $dui]);
    $gradesByStudent = [];
    foreach ($gradesQuery->fetchAll() as $grade) {
        $studentKey = (string) $grade['alumno_id'];
        $periodKey = (string) $grade['periodo_id'];
        $gradesByStudent[$studentKey][$periodKey] ??= [
            'id' => $grade['periodo_id'],
            'nombre' => $grade['periodo_nombre'],
            'finalizado' => true,
            'notas' => [],
        ];
        $gradesByStudent[$studentKey][$periodKey]['notas'][] = [
            'materia' => $grade['materia'],
            'nota' => $grade['nota'] === null ? null : (float) $grade['nota'],
        ];
    }

    foreach ($students as &$student) {
        $student['periodos'] = array_values($gradesByStudent[(string) $student['id']] ?? []);
    }
    unset($student);

    jsonResponse(['guardian' => $guardian, 'students' => $students]);
} catch (PDOException $exception) {
    error_log('No se pudo cargar el portal del encargado: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo consultar la información familiar.'], 500);
}
