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
$applicationId = filter_var($payload['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$action = $payload['action'] ?? null;
if ($applicationId === false || !in_array($action, ['aprobar', 'rechazar'], true)) {
    jsonResponse(['error' => 'Selecciona una solicitud y una acción válidas.'], 422);
}

$pdo = null;
try {
    $pdo = databaseConnection();
    $pdo->beginTransaction();

    $applicationQuery = $pdo->prepare('SELECT * FROM matriculas WHERE id = :id FOR UPDATE');
    $applicationQuery->execute(['id' => $applicationId]);
    $application = $applicationQuery->fetch();
    if (!$application) {
        $pdo->rollBack();
        jsonResponse(['error' => 'La solicitud ya no existe.'], 404);
    }
    if ($application['estado'] !== 'Pendiente') {
        $pdo->rollBack();
        jsonResponse(['error' => 'Esta solicitud ya fue revisada. Actualiza la lista.'], 409);
    }

    if ($action === 'rechazar') {
        $reject = $pdo->prepare(
            "UPDATE matriculas SET estado = 'Rechazado'
             WHERE id = :id AND estado = 'Pendiente'"
        );
        $reject->execute(['id' => $applicationId]);
        $pdo->commit();
        jsonResponse(['message' => 'La solicitud se marcó como rechazada.']);
    }

    $nieInput = $payload['nie'] ?? null;
    $sectionInput = filter_var($payload['seccion_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if (!is_string($nieInput) || !preg_match('/^[0-9]{1,10}$/', $nieInput)) {
        $pdo->rollBack();
        jsonResponse(['error' => 'Ingresa un NIE numérico válido para asignar al alumno.'], 422);
    }
    $nie = (int) $nieInput;
    if ($nie < 1 || $nie > 2147483647 || $sectionInput === false) {
        $pdo->rollBack();
        jsonResponse(['error' => 'El NIE o la sección seleccionada no son válidos.'], 422);
    }
    if (
        !$application['fecha_nac_est']
        || !$application['direccion_est']
        || !$application['tipo_bachillerato']
        || !$application['apellido_rep']
        || !$application['telefono_rep']
    ) {
        $pdo->rollBack();
        jsonResponse(['error' => 'Faltan datos requeridos del formulario. Solicita que completen la matrícula.'], 422);
    }

    $sectionQuery = $pdo->prepare(
        'SELECT id_seccion, id_especialidad
         FROM secciones
         WHERE id_seccion = :id'
    );
    $sectionQuery->execute(['id' => $sectionInput]);
    $section = $sectionQuery->fetch();
    if (!$section) {
        $pdo->rollBack();
        jsonResponse(['error' => 'La sección seleccionada ya no existe. Actualiza la lista.'], 422);
    }
    if (
        $application['tipo_bachillerato'] === 'Técnico'
        && (int) $section['id_especialidad'] !== (int) $application['id_especialidad']
    ) {
        $pdo->rollBack();
        jsonResponse(['error' => 'La sección debe corresponder a la especialidad elegida en la solicitud.'], 422);
    }

    $canonicalDui = preg_replace('/^([0-9]{8})-?([0-9])$/', '$1-$2', $application['dui_rep']);
    $guardianQuery = $pdo->prepare(
        "SELECT dui_encargado FROM encargado
         WHERE REPLACE(dui_encargado, '-', '') = :dui
         LIMIT 1 FOR UPDATE"
    );
    $guardianQuery->execute(['dui' => str_replace('-', '', $canonicalDui)]);
    $existingGuardianDui = $guardianQuery->fetchColumn();
    $guardianExists = is_string($existingGuardianDui);
    $guardianDui = $guardianExists ? $existingGuardianDui : $canonicalDui;
    $studentPin = (string) random_int(10000000, 99999999);
    $guardianPin = $guardianExists ? null : (string) random_int(10000000, 99999999);

    $pdo->exec('SAVEPOINT create_student_profile');
    if (!$guardianExists) {
        $insertGuardian = $pdo->prepare(
            'INSERT INTO encargado (dui_encargado, nombre, apellido, telefono, pin_acceso, pin_temporal)
             VALUES (:dui, :nombre, :apellido, :telefono, :pin, 1)'
        );
        $insertGuardian->execute([
            'dui' => $guardianDui,
            'nombre' => $application['nombre_rep'],
            'apellido' => $application['apellido_rep'],
            'telefono' => $application['telefono_rep'],
            'pin' => password_hash($guardianPin, PASSWORD_DEFAULT),
        ]);
    }

    $insertStudent = $pdo->prepare(
        'INSERT INTO alumno (
            nie_alumno, nombre, apellido, fecha_nac, telefono, correo_institucional,
            direccion, tipo_bachillerato, id_especialidad, notas_grado_anterior,
            carta_conducta, partida_nacimiento, pin_acceso, pin_temporal,
            dui_encargado, id_seccion
        ) VALUES (
            :nie, :nombre, :apellido, :fecha_nac, :telefono, :correo,
            :direccion, :tipo, :especialidad, :notas,
            :conducta, :partida, :pin, 1, :dui, :seccion
        )'
    );
    try {
        $insertStudent->execute([
            'nie' => $nie,
            'nombre' => $application['nombre_est'],
            'apellido' => $application['apellido_est'],
            'fecha_nac' => $application['fecha_nac_est'],
            'telefono' => $application['telefono_est'],
            'correo' => $application['correo_est'],
            'direccion' => $application['direccion_est'],
            'tipo' => $application['tipo_bachillerato'],
            'especialidad' => $application['id_especialidad'],
            'notas' => $application['ruta_notas'],
            'conducta' => $application['ruta_carta'],
            'partida' => $application['ruta_partida'],
            'pin' => password_hash($studentPin, PASSWORD_DEFAULT),
            'dui' => $guardianDui,
            'seccion' => $sectionInput,
        ]);
    } catch (PDOException $exception) {
        if ($exception->getCode() === '23000') {
            $pdo->exec('ROLLBACK TO SAVEPOINT create_student_profile');
            $pdo->rollBack();
            jsonResponse(['error' => 'El NIE o correo del alumno ya pertenece a otro perfil. Verifica los datos antes de aprobar.'], 409);
        }
        throw $exception;
    }

    $approve = $pdo->prepare(
        "UPDATE matriculas
         SET nie = :nie, grado_seccion = :seccion, estado = 'Aprobado'
         WHERE id = :id AND estado = 'Pendiente'"
    );
    $sectionNameQuery = $pdo->prepare('SELECT nombre_seccion FROM secciones WHERE id_seccion = :id');
    $sectionNameQuery->execute(['id' => $sectionInput]);
    $sectionName = (string) $sectionNameQuery->fetchColumn();
    $approve->execute([
        'nie' => (string) $nie,
        'seccion' => $sectionName,
        'id' => $applicationId,
    ]);
    $pdo->commit();

    jsonResponse([
        'message' => 'Solicitud aprobada y perfil del alumno creado.',
        'student' => [
            'nie' => (string) $nie,
            'correo' => $application['correo_est'],
            'pin_temporal' => $studentPin,
        ],
        'guardian' => [
            'dui' => $guardianDui,
            'pin_temporal' => $guardianPin,
            'cuenta_existente' => $guardianExists,
        ],
    ]);
} catch (PDOException $exception) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('No se pudo completar la revisión de matrícula: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo completar la revisión. Verifica la asignación y la estructura de la base de datos.'], 500);
}
