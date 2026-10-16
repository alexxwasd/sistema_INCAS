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
if (!is_array($payload)) {
    jsonResponse(['error' => 'La solicitud enviada no es válida.'], 400);
}

$sectionId = filter_var(
    $payload['seccion_id'] ?? null,
    FILTER_VALIDATE_INT,
    ['options' => ['min_range' => 1]]
);
$teacherDui = $payload['dui_docente'] ?? null;
if ($sectionId === false || (!is_string($teacherDui) && $teacherDui !== null)) {
    jsonResponse(['error' => 'La sección o el docente no son válidos.'], 422);
}

if (is_string($teacherDui)) {
    $teacherDui = trim($teacherDui);
    if ($teacherDui === '') {
        $teacherDui = null;
    } elseif (!preg_match('/^[0-9]{8}-?[0-9]$/', $teacherDui)) {
        jsonResponse(['error' => 'El DUI del docente no es válido.'], 422);
    } else {
        $teacherDui = preg_replace('/^([0-9]{8})-?([0-9])$/', '$1-$2', $teacherDui);
    }
}

try {
    $pdo = databaseConnection();
    $pdo->beginTransaction();

    $sectionQuery = $pdo->prepare(
        'SELECT dui_docente_guia
         FROM secciones
         WHERE id_seccion = :id
         FOR UPDATE'
    );
    $sectionQuery->execute(['id' => $sectionId]);
    if ($sectionQuery->fetchColumn() === false) {
        $pdo->rollBack();
        jsonResponse(['error' => 'No se encontró la sección seleccionada. Actualiza el panel.'], 404);
    }

    if ($teacherDui !== null) {
        $teacherQuery = $pdo->prepare(
            "SELECT dui_docente
             FROM docente
             WHERE REPLACE(dui_docente, '-', '') = :dui AND estado = 'ACTIVO'
             LIMIT 2
             FOR UPDATE"
        );
        $teacherQuery->execute(['dui' => str_replace('-', '', $teacherDui)]);
        $matchingTeachers = $teacherQuery->fetchAll(PDO::FETCH_COLUMN);
        if (count($matchingTeachers) !== 1) {
            $pdo->rollBack();
            if (count($matchingTeachers) > 1) {
                jsonResponse(['error' => 'Hay docentes activos con DUI duplicado. Corrige los datos antes de asignar la guía.'], 409);
            }
            jsonResponse(['error' => 'El docente no existe o no está activo. Actualiza la lista.'], 422);
        }
        $teacherDui = $matchingTeachers[0];
    }

    $update = $pdo->prepare(
        'UPDATE secciones
         SET dui_docente_guia = :dui
         WHERE id_seccion = :id'
    );
    $update->execute(['dui' => $teacherDui, 'id' => $sectionId]);
    $pdo->commit();

    jsonResponse([
        'message' => $teacherDui === null
            ? 'Se quitó el docente guía de la sección.'
            : 'Se actualizó el docente guía de la sección.',
        'dui_docente' => $teacherDui,
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('No se pudo asignar el docente guía: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo guardar el docente guía. Verifica la base de datos.'], 500);
}
