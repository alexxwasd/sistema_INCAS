const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();

// Middlewares para recibir JSON y permitir peticiones CORS
app.use(cors());
app.use(express.json());

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sistema_incas', // Nombre exacto de tu base de datos
    password: 'software', // <--- ¡CAMBIA ESTO por tu contraseña real de pgAdmin!
    port: 5432,
});

// Endpoint de Inicio de Sesión
app.post('/api/login', async (req, res) => {
    // Recibimos 'identifier' y 'pin' del formulario (pin equivale a la clave en la BD)
    const { identifier, pin } = req.body; 

    try {
        // Consulta relacionando usuarios y roles validando la columna 'clave'
        const consulta = `
            SELECT u.id_usuario, u.identificador, r.nombre_rol 
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.identificador = $1 AND u.clave = $2
        `;
        const resultado = await pool.query(consulta, [identifier, pin]);

        if (resultado.rows.length > 0) {
            const usuario = resultado.rows[0];
            
            // Determinar a qué página redirigir según el rol
            let paginaDestino = 'index.html';
            const rol = usuario.nombre_rol.toLowerCase();

            if (rol === 'administrador') paginaDestino = 'panel_admin.html';
            else if (rol === 'alumno') paginaDestino = 'panel_alumno.html';
            else if (rol === 'docente') paginaDestino = 'panel_docente.html';
            else if (rol === 'encargado') paginaDestino = 'panel_encargado.html';

            res.json({ 
                success: true, 
                mensaje: "¡Inicio de sesión correcto! Redirigiendo...", 
                redirectUrl: paginaDestino,
                usuario: {
                    id: usuario.id_usuario,
                    identificador: usuario.identificador,
                    rol: usuario.nombre_rol
                }
            });
        } else {
            res.json({ success: false, error: "Usuario o contraseña incorrectos." });
        }
    } catch (error) {
        console.error('Error en la autenticación:', error);
        res.json({ success: false, error: "Error en el servidor al verificar credenciales." });
    }
});


// ==========================================
// ENDPOINTS DEL PANEL ADMINISTRATIVO
// ==========================================

function valorONulo(valor) {
    if (typeof valor !== 'string') {
        return valor === undefined || valor === null || valor === '' ? null : valor;
    }

    const recortado = valor.trim();
    return recortado === '' ? null : recortado;
}

function parseIdEspecialidad(valor) {
    if (valor === undefined || valor === null || valor === '') {
        return NaN;
    }

    const texto = String(valor).trim();
    const comoEntero = parseInt(texto, 10);
    if (!Number.isNaN(comoEntero) && /^\d+$/.test(texto)) {
        return comoEntero;
    }

    const nombreNormalizado = texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const especialidadPorNombre = {
        'desarrollo de software': 1,
        'contabilidad': 2,
        'turismo': 3,
        'agropecuario': 4,
        'electrotecnia': 5,
        'general': 6
    };

    return especialidadPorNombre[nombreNormalizado] ?? NaN;
}

// 1. Obtener lista de Docentes
// Crear perfil docente dentro de una transacción
app.post('/api/admin/docentes', async (req, res) => {
    const body = req.body || {};
    const duiDigits = typeof body.dui === 'string' ? body.dui.trim().replace(/\D/g, '') : '';
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    const apellido = typeof body.apellido === 'string' ? body.apellido.trim() : '';
    const correo = valorONulo(body.correo);
    const telefono = valorONulo(body.telefono);
    const direccion = valorONulo(body.direccion);
    const fechaNac = valorONulo(body.fecha_nac);

    // Convertimos la especialidad recibida a un número entero (1 a 6)
    const idEspecialidadRaw = body.id_especialidad || body.especialidad;
    const idEspecialidad = parseIdEspecialidad(idEspecialidadRaw);

    if (
        duiDigits.length !== 9 ||
        !nombre ||
        !apellido ||
        !correo ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
        isNaN(idEspecialidad) ||
        idEspecialidad < 1 ||
        idEspecialidad > 6 ||
        nombre.length > 50 ||
        apellido.length > 50 ||
        correo.length > 100 ||
        (telefono && telefono.length > 20) ||
        (direccion && direccion.length > 255)
    ) {
        return res.status(400).json({ success: false, error: 'Completa los datos del docente seleccionando una especialidad válida.' });
    }

    const dui = `${duiDigits.slice(0, 8)}-${duiDigits.slice(8)}`;
    let client;
    let transactionStarted = false;

    try {
        client = await pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        const userResult = await client.query(
            `INSERT INTO usuarios (identificador, clave, id_rol)
             VALUES ($1, $2, $3)
             RETURNING id_usuario`,
            [correo, dui, 4]
        );

        await client.query(
            `INSERT INTO docente (dui_docente, id_usuario, nombre, apellido, id_especialidad, correo, direccion, telefono, fecha_nac)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [dui, userResult.rows[0].id_usuario, nombre, apellido, idEspecialidad, correo, direccion, telefono, fechaNac]
        );

        await client.query('COMMIT');
        return res.status(201).json({ success: true, mensaje: 'Docente creado correctamente.' });

    } catch (error) {
        if (transactionStarted && client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error al revertir la creación del docente:', rollbackError);
            }
        }
        if (error.code === '23505') {
            return res.status(409).json({ success: false, error: 'El identificador o DUI ya está registrado.' });
        }
        console.error('Error al crear docente:', error);
        return res.status(500).json({ success: false, error: 'Error al crear el docente.' });
    } finally {
        client?.release();
    }
});

// 2. Obtener lista de Alumnos
app.get('/api/admin/alumnos', async (req, res) => {
    try {
        const consulta = `
            SELECT 
                u.id_usuario, 
                u.identificador, 
                a.nie_alumno AS nie, 
                a.nombre, 
                a.apellido, 
                s.nombre_seccion
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            LEFT JOIN alumno a ON u.id_usuario = a.id_usuario
            LEFT JOIN secciones s ON a.id_seccion = s.id_seccion
            WHERE LOWER(r.nombre_rol) = 'alumno'
        `;
        const resultado = await pool.query(consulta);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error('Error al obtener alumnos:', error);
        res.status(500).json({ success: false, error: 'Error al consultar alumnos' });
    }
});

// 3. Obtener lista de Encargados
app.get('/api/admin/encargados', async (req, res) => {
    try {
        const consulta = `
            SELECT u.id_usuario, u.identificador, e.dui_encargado, e.nombre, e.apellido, e.telefono
            FROM usuarios u
            JOIN roles r ON u.id_rol = r.id_rol
            LEFT JOIN encargado e ON u.id_usuario = e.id_usuario
            WHERE LOWER(r.nombre_rol) = 'encargado'
        `;
        const resultado = await pool.query(consulta);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error('Error al obtener encargados:', error);
        res.status(500).json({ success: false, error: 'Error al consultar encargados' });
    }
});

// 4. Obtener Secciones
app.get('/api/admin/secciones', async (req, res) => {
    try {
        const consulta = `
            SELECT s.id_seccion, s.nombre_seccion, a.nombre_anio AS anio, d.nombre || ' ' || d.apellido AS docente_guia
            FROM secciones s
            LEFT JOIN anios a ON s.id_anio = a.id_anio
            LEFT JOIN docente d ON s.dui_docente_guia = d.dui_docente
        `;
        const resultado = await pool.query(consulta);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error('Error al obtener secciones:', error);
        res.status(500).json({ success: false, error: 'Error al consultar secciones' });
    }
});

// 5. Obtener lista de Años para el formulario de secciones
app.get('/api/admin/anios', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM anios ORDER BY id_anio ASC');
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error('Error al obtener años:', error);
        res.status(500).json({ success: false, error: 'Error al consultar años' });
    }
});

// Obtener la lista de especialidades para el formulario de docentes.
app.get('/api/admin/especialidades', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM especialidades');
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error('Error al obtener especialidades:', error);
        res.status(500).json({ success: false, error: 'Error al consultar especialidades' });
    }
});

// Crear sección asignando el DUI de su docente guía.
app.post('/api/admin/secciones', async (req, res) => {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body
        : {};
    const nombreSeccion = typeof body.nombre_seccion === 'string' ? body.nombre_seccion.trim() : '';
    const idAnio = Number(body.id_anio);
    const duiDigits = typeof body.dui_docente_guia === 'string'
        ? body.dui_docente_guia.trim().replace(/\D/g, '')
        : '';

    if (
        !nombreSeccion
        || nombreSeccion.length > 100
        || !Number.isInteger(idAnio)
        || idAnio <= 0
        || duiDigits.length !== 9
    ) {
        return res.status(400).json({ success: false, error: 'Completa los datos de la sección con valores válidos.' });
    }

    const duiDocenteGuia = `${duiDigits.slice(0, 8)}-${duiDigits.slice(8)}`;

    try {
        await pool.query(
            `INSERT INTO secciones (nombre_seccion, id_anio, dui_docente_guia)
             VALUES ($1, $2, $3)`,
            [nombreSeccion, idAnio, duiDocenteGuia]
        );

        return res.status(201).json({ success: true, mensaje: 'Sección creada correctamente.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ success: false, error: 'La sección ya está registrada.' });
        }

        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'El año o el docente guía no corresponde a un registro válido.' });
        }

        console.error('Error al crear sección:', error);
        return res.status(500).json({ success: false, error: 'Error al crear la sección.' });
    }
});

// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
    console.log('Servidor backend encendido en http://localhost:3000');
});