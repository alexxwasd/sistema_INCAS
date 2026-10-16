# Guía para entender la conexión con la base de datos

**[Descargar esta guía](http://localhost/System_INCAS/api/descargar_guia.php)** desde la instalación local de XAMPP.

## Idea principal

La página del navegador no abre una conexión directa con MySQL. La comunicación pasa por tres partes:

```text
HTML y JavaScript del navegador
        │  fetch() y FormData sobre HTTP
        ▼
PHP en Apache (api/)
        │  PDO y consultas SQL
        ▼
MariaDB/MySQL en XAMPP (db_matricula_incas)
```

El navegador puede validar para ayudar al usuario, pero el servidor PHP vuelve a validar porque cualquier persona puede modificar una petición antes de enviarla. PHP mantiene las credenciales y ejecuta consultas preparadas; la contraseña de la base nunca se envía al navegador.

## Qué parte del sistema ya usa la base

Están conectados **la matrícula, el acceso de usuarios, la creación de perfiles docentes, la revisión administrativa y la consulta básica de perfiles de alumno y encargado**:

- `JS/matricula.js` consulta las especialidades y envía los datos del formulario.
- `api/especialidades.php` lee la tabla `especialidades`.
- `api/matricula.php` valida los datos y los documentos, guarda una fila en `matriculas` y responde con el identificador de la solicitud.
- `api/admin_setup.php` permite crear el primer administrador cuando la tabla `administrador` está vacía.
- `api/admin_session.php` inicia y cierra las sesiones de administrador, alumno, encargado y docente.
- `api/admin_teacher_create.php` permite al administrador crear un perfil docente activo con un PIN temporal.
- `api/admin_guardian_reset_pin.php` permite al administrador generar un PIN temporal nuevo para un encargado que perdió el anterior.
- `api/admin_section_guide.php` permite asignar o quitar el docente guía de una sección.
- `api/admin_data.php`, `api/admin_document.php` y `api/admin_review.php` cargan información del panel, permiten revisar adjuntos y aprobar o rechazar solicitudes.
- `api/student_portal.php` y `api/guardian_portal.php` cargan el perfil de la cuenta autenticada y las notas de períodos cerrados.
- `private/database.php` guarda la configuración local de conexión y `api/bootstrap.php` la utiliza mediante PDO.

El panel administrador consulta docentes, secciones y solicitudes reales, permite crear perfiles docentes y asigna el docente guía de cada sección. Al aprobar una matrícula, crea el perfil del alumno y del encargado. Las asignaciones de materias se manejan aparte de la guía de sección. El alumno y el encargado pueden entrar y consultar sus propios datos y notas de períodos cerrados. El portal docente todavía no carga las secciones desde la base y las notas ingresadas no se guardan; la autenticación de ese rol solo permite entrar a su portal actual.

En la pantalla de inicio se selecciona el rol. Administrador y docente usan correo y PIN; alumno usa correo institucional y PIN; encargado usa DUI y PIN.

## Para qué sirve cada archivo de datos y conexión

| Archivo | Para qué sirve |
| --- | --- |
| `private/database.php` | Devuelve host, base, usuario y contraseña al código PHP. Si el entorno no define variables, usa `127.0.0.1`, `db_matricula_incas` y los valores locales de XAMPP detectados. |
| `api/bootstrap.php` | Funciones comunes de la API: crear conexión PDO, normalizar textos, validar imágenes y devolver respuestas JSON con códigos HTTP. |
| `api/especialidades.php` | Endpoint `GET`: obtiene identificadores y nombres reales de la tabla `especialidades`. |
| `api/matricula.php` | Endpoint `POST`: recibe el formulario, vuelve a validar los campos, verifica la especialidad, almacena los adjuntos y registra la solicitud. |
| `api/admin_session.php` | Inicia/cierra sesión y comprueba la identidad y el rol de la cuenta. |
| `api/admin_setup.php` | Crea una sola vez el primer administrador cuando no hay administradores registrados. |
| `api/admin_teacher_create.php` | Crea un perfil docente activo y genera un PIN temporal para su primer inicio de sesión. |
| `api/admin_guardian_reset_pin.php` | Reemplaza el PIN de un encargado por uno temporal nuevo y lo devuelve una sola vez al panel autenticado. |
| `api/admin_section_guide.php` | Guarda o quita la relación de guía de una sección con una cuenta docente activa. |
| `api/admin_auth.php` | Comparte las funciones de sesión y protección del panel administrativo. |
| `api/admin_data.php` | Devuelve solicitudes pendientes, docentes y secciones para el administrador autenticado. |
| `api/admin_document.php` | Entrega un documento de solicitud solo al administrador autenticado. |
| `api/admin_review.php` | Rechaza una solicitud o aprueba una creando el perfil del alumno y el del encargado si no existía. |
| `api/student_portal.php` | Devuelve los datos y notas del alumno que inició sesión. |
| `api/guardian_portal.php` | Devuelve los datos del encargado y los alumnos vinculados a su DUI. |
| `private/.htaccess` | Bloquea el acceso web directo a la configuración privada. |
| `storage/.htaccess` | Bloquea la descarga directa de documentos adjuntos. |
| `storage/enrollment/` | Carpeta donde PHP conserva las imágenes de los expedientes. No guarda los documentos dentro de MySQL; la fila de matrícula guarda sus rutas. |
| `database/migrations/20261016_enrollment_fields.sql` | Cambio versionado del esquema necesario para guardar la información nueva del formulario. |
| `database/migrations/20261016_student_specialty.sql` | Agrega a los perfiles de alumno la especialidad de bachillerato y su relación con `especialidades`. |
| `database/migrations/20261016_section_teacher_guide.sql` | Agrega la relación entre una sección y su docente guía, y crea el archivo para las antiguas asignaciones no activadas. |
| `database/CONEXION.md` | Resumen operativo de la conexión, configuración local y advertencias para desplegarla. |
| `database/GUIA_BASE_DATOS.md` | Esta explicación completa del recorrido de datos, los archivos y la estructura. |

La conexión que crea `databaseConnection()` usa **PDO**, un componente de PHP para hablar con la base. La configuración activa `ERRMODE_EXCEPTION` para detectar errores y `EMULATE_PREPARES = false` para usar consultas preparadas reales del controlador de MySQL.

## Recorrido de una solicitud

1. `matricula.html` muestra tres pasos. Cada dato tiene un `name`, por ejemplo `nombre_est` o `dui_rep`; ese nombre es la clave con la que JavaScript y PHP encuentran el valor.
2. `JS/matricula.js` impide avanzar con campos inválidos, muestra el resumen y carga el catálogo con `GET api/especialidades.php`.
3. Al confirmar, `new FormData(form)` empaqueta campos y archivos y los envía mediante `POST api/matricula.php`. El navegador genera el formato multipart necesario para adjuntar archivos; no se debe establecer manualmente su encabezado `Content-Type`.
4. PHP comprueba formatos y longitudes, fecha, correo, teléfonos, DUI, confirmación y, para Técnico, que el identificador de especialidad exista.
5. PHP verifica que cada adjunto sea una imagen JPG, PNG o WebP auténtica y no exceda 5 MB. Los archivos reciben nombres aleatorios y se guardan en `storage/enrollment/`; la tabla guarda únicamente rutas relativas.
6. PDO inserta la fila con estado `Pendiente`. NIE (`nie`) y sección (`grado_seccion`) quedan `NULL` porque se asignan cuando el administrador apruebe la solicitud.
7. El servidor devuelve JSON y el navegador muestra el número de solicitud o un mensaje de error. Un error no se presenta como guardado exitoso.

Las imágenes no son servidas directamente por Apache. El administrador las revisa mediante `api/admin_document.php`, que comprueba la sesión antes de entregar el documento.

Las respuestas de la API indican el resultado con el código HTTP: `201` significa que la solicitud se creó, `422` que un dato no pasó validación, `405` que se usó un método no permitido y `500` que hubo un problema interno. El navegador lee el mensaje JSON y lo muestra al usuario.

## Crear el primer administrador y aprobar solicitudes

1. Abre `http://localhost/System_INCAS/`. Si la tabla `administrador` está vacía, aparece el enlace **Configurar el primer administrador**.
2. Completa nombre, apellido, DUI, correo y un PIN numérico de 6 a 12 dígitos. La configuración inicial se cierra cuando se crea esa cuenta.
3. En inicio de sesión, selecciona Administrador e ingresa el correo y PIN que configuraste.
4. En **Solicitudes de matrícula**, abre los documentos adjuntos y revisa los datos. Las secciones y los docentes se cargan desde sus tablas reales; no se crean valores de ejemplo.
5. Para aprobar una solicitud, asigna el NIE que proporciona el instituto y elige una sección registrada. Para bachillerato Técnico, solo se ofrecen secciones asociadas a la especialidad seleccionada. Si la lista está vacía, registra primero las secciones reales en la base de datos.
6. La aprobación crea el perfil del alumno en `alumno`, crea un encargado si ese DUI todavía no existe y cambia la solicitud a `Aprobado`. Los tres cambios de base se procesan en una transacción.
7. El panel entrega una vez el PIN temporal del alumno y, si es una cuenta nueva, el PIN temporal del encargado. Anótalos y compártelos con sus titulares; al recargar, no se vuelven a mostrar. Si el encargado ya tenía cuenta, se conserva su PIN.
8. Para rechazar, se cambia el estado a `Rechazado` sin crear perfiles. Si algo falla al aprobar, la transacción se revierte y la solicitud permanece pendiente.

En la pantalla de acceso se elige el rol: alumno usa correo institucional y PIN, encargado usa DUI y PIN, y administrador o docente usan correo y PIN. Alumno y encargado pueden consultar los datos de su perfil; el portal docente todavía no carga datos ni guarda notas en la base.

## Crear un perfil docente

1. Entra al panel con la cuenta de administrador y abre la sección **Docentes**.
2. Completa DUI, nombre, apellido y correo; teléfono y dirección son opcionales.
3. Al crear el perfil, el panel muestra un PIN temporal. El docente entra seleccionando **Docente** e ingresando el correo y ese PIN.
4. Anota el PIN en ese momento: el sistema lo guarda como hash y no vuelve a mostrarlo.
5. Este formulario solo crea el perfil. Las asignaciones a materias se harán después.

En **Secciones**, selecciona un docente activo en **Docente guía** y pulsa **Guardar asignación**. La relación se guarda en `secciones.dui_docente_guia`, separada de las asignaciones de materias.

En esta instalación, **Fredy Teran** quedó vinculado como guía de **Segundo K**. La materia antigua **Desarrollo de Software**, que no indicaba año lectivo, se conservó sin activar en `asignacion_docente_legacy_archive`. Las tablas antiguas `docentes` y `materias_docente` se retiraron después de respaldar y archivar el registro.

## Restablecer el PIN de un encargado

1. Entra al panel administrador y abre **Encargados**.
2. Busca el perfil por nombre, DUI y alumnos vinculados; pulsa **Generar PIN temporal nuevo**.
3. Confirma la acción. El PIN anterior deja de funcionar y el nuevo PIN temporal se muestra una sola vez.
4. Entrégale el nuevo PIN al encargado; inicia sesión seleccionando **Encargado**, con su DUI y el nuevo PIN.

## Datos que guarda una solicitud

El endpoint enlaza los datos del formulario con estas columnas:

| Información del formulario | Columna de `matriculas` |
| --- | --- |
| Nombre y apellido del alumno | `nombre_est`, `apellido_est` |
| Fecha, correo, teléfono y dirección | `fecha_nac_est`, `correo_est`, `telefono_est`, `direccion_est` |
| Tipo y especialidad del bachillerato | `tipo_bachillerato`, `id_especialidad` |
| Nombre, apellido, DUI y teléfono del encargado | `nombre_rep`, `apellido_rep`, `dui_rep`, `telefono_rep` |
| Partida, notas previas y carta | `ruta_partida`, `ruta_notas`, `ruta_carta` |
| Estado de la solicitud | `estado` (`Pendiente` hasta la revisión administrativa) |

`id_especialidad` se relaciona con la llave primaria `especialidades.id_especialidad`. Las rutas de los archivos identifican documentos en el servidor y no contienen la imagen binaria. La tabla `matriculas` registra una solicitud pendiente; después, el administrador la revisa y puede asignarle un NIE y sección para crear el perfil definitivo en `alumno`. Si el DUI todavía no existe en `encargado`, la aprobación también crea ese perfil.

## Qué cambia la migración

El archivo `migrations/20261016_enrollment_fields.sql` modifica **la estructura**, no crea matrículas:

- Permite que `matriculas.nie` y `matriculas.grado_seccion` queden vacíos mientras una solicitud está pendiente.
- Agrega fecha de nacimiento, apellido y teléfono del encargado, dirección, tipo de bachillerato e identificador de especialidad.
- Añade una llave foránea de `matriculas.id_especialidad` hacia `especialidades.id_especialidad`; así no se puede guardar una especialidad que no exista.

La migración ya se aplicó a la base local `db_matricula_incas` el 16 de octubre de 2026, tras crear este respaldo:
`C:\xampp\private\incas_backups\db_matricula_incas_before_enrollment_api_20261016_103152.sql`.

**No vuelvas a ejecutar esa migración en esta instalación:** sus columnas y su llave foránea ya existen. Para llevar el proyecto a otra base, primero haz un respaldo y comprueba qué cambios del esquema faltan; una migración `ALTER TABLE` no es un archivo para importar repetidamente.

La migración `migrations/20261016_student_specialty.sql` también se aplicó después de guardar el respaldo:
`C:\xampp\private\incas_backups\db_matricula_incas_before_student_profile_20261016_111855.sql`.
Esta migración agrega `alumno.id_especialidad` y su relación con `especialidades`; no se debe ejecutar otra vez en esta instalación.

La migración `migrations/20261016_section_teacher_guide.sql` agrega la llave opcional de guía en `secciones` y la tabla de archivo para asignaciones antiguas. En esta instalación se respaldó la base antes de enlazar al docente guía confirmado con **Segundo K**, archivar la fila antigua y eliminar `docentes` y su tabla dependiente `materias_docente`. El respaldo está en `C:\xampp\private\incas_backups`; no importes esa migración de nuevo aquí.

## Cómo comprobarlo en phpMyAdmin

1. Inicia **Apache** y **MySQL** desde el panel de XAMPP y abre `http://localhost/phpmyadmin/`.
2. Selecciona la base `db_matricula_incas` y luego la tabla `matriculas`.
3. En **Estructura** se pueden revisar las columnas añadidas y la relación con `especialidades`.
4. En **Examinar** aparecerán solicitudes reales con estado `Pendiente` después de enviar el formulario; no hay un registro de prueba en la base activa.
5. En la tabla `especialidades`, si no existen filas, el formulario avisará que no hay opciones para el bachillerato Técnico. Se deben agregar especialidades autorizadas por el instituto; no se generan valores de ejemplo automáticamente.

Las consultas `SELECT`, las claves foráneas y las transacciones que aparecen en los endpoints ayudan a validar, enlazar o guardar la información. Para explicar un `INSERT`, por ejemplo: «PHP prepara una instrucción SQL con espacios nombrados como `:correo_est`, y luego entrega los valores aparte; esto evita concatenar datos del formulario dentro del SQL».

## Términos básicos

- **Base de datos:** contenedor de tablas; aquí se llama `db_matricula_incas`.
- **Tabla:** estructura que agrupa registros del mismo tipo, por ejemplo `matriculas` o `especialidades`.
- **Fila o registro:** un elemento guardado; cada envío crea una fila de matrícula.
- **Columna:** un dato dentro de la fila, como `correo_est` o `estado`.
- **Clave primaria:** identificador único de una fila; en `matriculas` es `id`.
- **Clave foránea:** regla que exige que un identificador relacionado exista; `id_especialidad` apunta a `especialidades`.
- **Endpoint:** URL del servidor que atiende una acción; por ejemplo `api/matricula.php`.
- **Consulta preparada:** SQL cuyo texto se separa de sus valores para reducir riesgo de inyección SQL.
- **Transacción:** grupo de cambios de base de datos que se confirma completo con `commit()` o se revierte con `rollBack()` si falla.
- **JSON:** formato de texto usado para que PHP devuelva al navegador un resultado o un mensaje de error.

## Configuración y seguridad

En esta instalación, PHP pudo conectarse con el usuario local `root` sin contraseña, que es una configuración de desarrollo de XAMPP. Para cambiar la conexión se pueden definir `INCAS_DB_HOST`, `INCAS_DB_NAME`, `INCAS_DB_USER` e `INCAS_DB_PASSWORD` en el entorno de PHP.

**No publiques esta configuración local en Internet.** En producción se necesita crear un usuario específico con contraseña y solo los permisos mínimos necesarios. La carpeta `private` no debe quedar expuesta, aunque se utilice `.htaccess`.

## Guion breve para explicarlo en una presentación

> «El formulario se comunica con el servidor usando PHP; no se conecta directamente a MySQL. JavaScript envía los datos y documentos a la API. PHP valida la información, usa PDO para guardar la solicitud pendiente en `matriculas` y conserva las imágenes como archivos privados. El administrador revisa los documentos y, al aprobar, asigna el NIE y la sección, crea el perfil del alumno y vincula al encargado. Los PIN se guardan cifrados y el alumno y encargado pueden consultar sus perfiles autenticándose con su correo o DUI».
