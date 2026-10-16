# Conexión de matrícula

Para aprender cómo se conectan el formulario, PHP, PDO y MySQL, consulta la [Guía de la base de datos](./GUIA_BASE_DATOS.md) o [descarga la guía desde XAMPP](http://localhost/System_INCAS/api/descargar_guia.php).

La matrícula se envía desde `JS/matricula.js` a `api/matricula.php`. El endpoint valida los datos, guarda la solicitud con PDO en `db_matricula_incas.matriculas` y deja el estado en `Pendiente`. NIE y sección se asignan al aprobar; no se crean cuentas de alumno ni de encargado durante la solicitud.

Si no existe una cuenta en `administrador`, el enlace **Configurar el primer administrador** aparece en la página inicial. Después se puede iniciar sesión con el correo y PIN configurados, revisar solicitudes y aprobarlas o rechazarlas. Al aprobar, se crean los perfiles asociados y se genera un PIN temporal cuando corresponda.

En la sección **Docentes** del panel administrativo se puede crear un perfil docente con DUI, nombre, apellido y correo; teléfono y dirección son opcionales. El sistema genera un PIN temporal que se muestra al crearlo. Las asignaciones a materias se registrarán después.

En la sección **Encargados**, el administrador puede generar un PIN temporal nuevo si se perdió el anterior. La operación invalida el PIN previo y muestra el nuevo una sola vez.

En la sección **Secciones**, el administrador puede asignar o quitar un docente guía activo. La llave `secciones.dui_docente_guia` apunta a la tabla `docente`; la guía es distinta de una asignación de materia.

El alumno entra con su correo institucional y PIN; el encargado, con su DUI y PIN. Ambos portales consultan sus perfiles y las notas de períodos cerrados. El login docente está disponible, pero su portal y el guardado de calificaciones todavía no consultan MySQL.

`api/especialidades.php` obtiene las especialidades registradas en la tabla `especialidades`. Si no hay registros, el bachillerato Técnico no se puede completar hasta que se agreguen especialidades válidas.

## Configuración local

`private/database.php` contiene los valores locales de conexión. Por defecto usa el usuario `root` sin contraseña, que es la configuración XAMPP detectada en esta instalación. Si MySQL tiene otra configuración, define las variables de entorno `INCAS_DB_HOST`, `INCAS_DB_NAME`, `INCAS_DB_USER` e `INCAS_DB_PASSWORD`.

La carpeta `private` está bloqueada por Apache mediante `.htaccess`. No publiques una configuración con credenciales ni uses el usuario `root` sin contraseña en un servidor accesible desde Internet. Para producción, crea un usuario de aplicación con permisos mínimos: lectura de `especialidades` e inserción en `matriculas`.

Los tres documentos se validan como JPG, PNG o WebP, con un máximo de 5 MB cada uno, y se guardan en `storage/enrollment`. Apache bloquea el acceso web directo; el endpoint de documentos solo los entrega al administrador autenticado.

## Esquema

Las migraciones `migrations/20261016_enrollment_fields.sql`, `migrations/20261016_student_specialty.sql` y `migrations/20261016_section_teacher_guide.sql` se aplicaron en esta instalación el 16 de octubre de 2026; no las vuelvas a ejecutar aquí. En otra instalación, respalda la base y verifica que las columnas y llaves foráneas todavía no existan antes de aplicarlas. La limpieza del modelo antiguo se conserva en el respaldo y en `asignacion_docente_legacy_archive`; la materia antigua no se convierte en una asignación activa porque no tiene año lectivo.
