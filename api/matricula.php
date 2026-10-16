<?php
declare(strict_types=1);

require __DIR__ . DIRECTORY_SEPARATOR . 'bootstrap.php';

// Recibir solicitudes solo por POST protege la intención de modificar información.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    jsonResponse(['error' => 'Método no permitido.'], 405);
}

// Limita el tamaño conjunto de los datos y archivos antes de validarlos.
$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 20 * 1024 * 1024) {
    jsonResponse(['error' => 'La solicitud supera el tamaño máximo permitido.'], 413);
}

// Lee y valida los campos de texto recibidos desde FormData.
$studentName = textField('nombre_est', 100);
$studentSurname = textField('apellido_est', 100);
$birthDate = textField('fecha_nac_est', 10);
$email = textField('correo_est', 100);
$studentPhone = textField('telefono_est', 20);
$address = textField('direccion_est', 5000);
$bachelorType = textField('tipo_bachillerato', 20);
$guardianName = textField('nombre_rep', 100);
$guardianSurname = textField('apellido_rep', 100);
$guardianDui = textField('dui_rep', 10);
$guardianPhone = textField('telefono_rep', 20);

// Repite en el servidor las reglas del navegador: el servidor es la validación confiable.
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['error' => 'Ingresa un correo institucional válido.'], 422);
}
if (!preg_match('/^\+?[0-9]{7,15}$/', $studentPhone) || !preg_match('/^\+?[0-9]{7,15}$/', $guardianPhone)) {
    jsonResponse(['error' => 'Los teléfonos deben tener entre 7 y 15 dígitos y pueden iniciar con +.'], 422);
}
if (!preg_match('/^[0-9]{8}-?[0-9]$/', $guardianDui)) {
    jsonResponse(['error' => 'Ingresa un DUI válido: 8 dígitos y un dígito verificador.'], 422);
}
if (!in_array($bachelorType, ['General', 'Técnico'], true)) {
    jsonResponse(['error' => 'Selecciona un tipo de bachillerato válido.'], 422);
}
// Una solicitud no se acepta si el interesado no confirmó el resumen.
if (($_POST['confirmacion'] ?? null) !== 'on') {
    jsonResponse(['error' => 'Confirma que la información proporcionada es correcta.'], 422);
}

// Verifica calendario y rechaza fechas imposibles o posteriores al día de hoy.
$birthDateValue = DateTimeImmutable::createFromFormat('!Y-m-d', $birthDate);
$dateErrors = DateTimeImmutable::getLastErrors();
if (
    $birthDateValue === false
    || $birthDateValue->format('Y-m-d') !== $birthDate
    || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
    || $birthDateValue > new DateTimeImmutable('today')
) {
    jsonResponse(['error' => 'Ingresa una fecha de nacimiento válida que no sea futura.'], 422);
}

// La especialidad solo aplica a Técnico y debe existir realmente en la base.
$specialtyId = null;
if ($bachelorType === 'Técnico') {
    $rawSpecialtyId = $_POST['id_especialidad'] ?? null;
    $validatedSpecialtyId = filter_var($rawSpecialtyId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($validatedSpecialtyId === false) {
        jsonResponse(['error' => 'Selecciona una especialidad válida para el bachillerato Técnico.'], 422);
    }
    $specialtyId = $validatedSpecialtyId;
}

// Nombres de los campos de archivo y mensajes para informar errores claros.
$uploadDirectory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'enrollment';
$storedFiles = [];
$pdo = null;
$fileFields = [
    'partida_nacimiento' => 'partida de nacimiento',
    'notas_grado_anterior' => 'notas del grado anterior',
    'carta_conducta' => 'carta de buena conducta',
];

try {
    // Comprueba primero la especialidad, antes de almacenar documentos del usuario.
    $pdo = databaseConnection();
    if ($specialtyId !== null) {
        $specialtyCheck = $pdo->prepare('SELECT 1 FROM especialidades WHERE id_especialidad = :id');
        $specialtyCheck->execute(['id' => $specialtyId]);
        if ($specialtyCheck->fetchColumn() === false) {
            jsonResponse(['error' => 'La especialidad seleccionada ya no está disponible. Recarga la página.'], 422);
        }
    }

    // Los archivos se comprueban por contenido y se renombran con identificadores aleatorios.
    $uploads = [];
    foreach ($fileFields as $key => $label) {
        $uploads[$key] = validateUploadedImage($key, $label);
        $uploads[$key]['file_name'] = bin2hex(random_bytes(16)) . '.' . $uploads[$key]['extension'];
    }

    // La carpeta de documentos está bloqueada por Apache; la tabla solo guarda rutas relativas.
    if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0750, true) && !is_dir($uploadDirectory)) {
        throw new RuntimeException('No está disponible el almacenamiento de documentos.');
    }
    foreach ($uploads as $key => $upload) {
        $destination = $uploadDirectory . DIRECTORY_SEPARATOR . $upload['file_name'];
        if (!move_uploaded_file($upload['tmp_name'], $destination)) {
            throw new RuntimeException('No se pudo guardar uno de los documentos.');
        }
        $storedFiles[$key] = $upload['file_name'];
    }

    // Una transacción evita una solicitud parcialmente insertada en la tabla.
    $relativePath = static fn (string $fileName): string => 'storage/enrollment/' . $fileName;
    $pdo->beginTransaction();
    $statement = $pdo->prepare(
        "INSERT INTO matriculas (
            nombre_est, apellido_est, fecha_nac_est, nie, grado_seccion,
            nombre_rep, apellido_rep, dui_rep, telefono_rep, telefono_est, correo_est,
            direccion_est, tipo_bachillerato, id_especialidad,
            ruta_partida, ruta_notas, ruta_carta, estado
        ) VALUES (
            :nombre_est, :apellido_est, :fecha_nac_est, NULL, NULL,
            :nombre_rep, :apellido_rep, :dui_rep, :telefono_rep, :telefono_est, :correo_est,
            :direccion_est, :tipo_bachillerato, :id_especialidad,
            :ruta_partida, :ruta_notas, :ruta_carta, 'Pendiente'
        )"
    );
    $statement->execute([
        'nombre_est' => $studentName,
        'apellido_est' => $studentSurname,
        'fecha_nac_est' => $birthDate,
        'nombre_rep' => $guardianName,
        'apellido_rep' => $guardianSurname,
        'dui_rep' => $guardianDui,
        'telefono_rep' => $guardianPhone,
        'telefono_est' => $studentPhone,
        'correo_est' => $email,
        'direccion_est' => $address,
        'tipo_bachillerato' => $bachelorType,
        'id_especialidad' => $specialtyId,
        'ruta_partida' => $relativePath($storedFiles['partida_nacimiento']),
        'ruta_notas' => $relativePath($storedFiles['notas_grado_anterior']),
        'ruta_carta' => $relativePath($storedFiles['carta_conducta']),
    ]);
    $applicationId = (int) $pdo->lastInsertId();
    $pdo->commit();

    // Devuelve el identificador creado; el estado inicial siempre queda pendiente de aprobación.
    jsonResponse([
        'id' => $applicationId,
        'message' => 'La solicitud se guardó correctamente y quedó pendiente de revisión.',
    ], 201);
} catch (PDOException $exception) {
    // Revierte la inserción y elimina adjuntos si la base de datos rechaza la operación.
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    foreach ($storedFiles as $fileName) {
        $path = $uploadDirectory . DIRECTORY_SEPARATOR . $fileName;
        if (is_file($path)) {
            unlink($path);
        }
    }
    error_log('No se pudo guardar la solicitud de matrícula: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudo guardar la solicitud. Verifica la conexión y la estructura de la base de datos.'], 500);
} catch (RuntimeException $exception) {
    foreach ($storedFiles as $fileName) {
        $path = $uploadDirectory . DIRECTORY_SEPARATOR . $fileName;
        if (is_file($path)) {
            unlink($path);
        }
    }
    error_log('No se pudo guardar un documento de matrícula: ' . $exception->getMessage());
    jsonResponse(['error' => 'No se pudieron guardar los documentos adjuntos. Inténtalo más tarde.'], 500);
}
