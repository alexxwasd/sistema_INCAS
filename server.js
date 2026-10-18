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
        // Consulta relacionando USUARIOS y ROLES validando la columna 'clave'
        const consulta = `
            SELECT u.id_usuario, u.identificador, r.nombre_rol 
            FROM USUARIOS u
            JOIN ROLES r ON u.id_rol = r.id_rol
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

// 1. Obtener lista de Docentes
app.get('/api/admin/docentes', async (req, res) => {
    try {
        const consulta = `
            SELECT u.id_usuario, u.identificador, d.dui_docente, d.nombre, d.apellido, d.especialidad
            FROM USUARIOS u
            JOIN ROLES r ON u.id_rol = r.id_rol
            LEFT JOIN DOCENTES d ON u.id_usuario = d.id_usuario
            WHERE LOWER(r.nombre_rol) = 'docente'
        `;
        const resultado = await pool.query(consulta);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error('Error al obtener docentes:', error);
        res.status(500).json({ success: false, error: 'Error al consultar docentes' });
    }
});

// 2. Obtener lista de Alumnos
app.get('/api/admin/alumnos', async (req, res) => {
    try {
        const consulta = `
            SELECT u.id_usuario, u.identificador, a.nie, a.nombre, a.apellido, s.nombre_seccion
            FROM USUARIOS u
            JOIN ROLES r ON u.id_rol = r.id_rol
            LEFT JOIN ALUMNOS a ON u.id_usuario = a.id_usuario
            LEFT JOIN SECCIONES s ON a.id_seccion = s.id_seccion
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
            FROM USUARIOS u
            JOIN ROLES r ON u.id_rol = r.id_rol
            LEFT JOIN ENCARGADOS e ON u.id_usuario = e.id_usuario
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
            SELECT s.id_seccion, s.nombre_seccion, s.grado, d.nombre || ' ' || d.apellido AS docente_guia
            FROM SECCIONES s
            LEFT JOIN DOCENTES d ON s.dui_docente_guia = d.dui_docente
        `;
        const resultado = await pool.query(consulta);
        res.json({ success: true, datos: resultado.rows });
    } catch (error) {
        console.error('Error al obtener secciones:', error);
        res.status(500).json({ success: false, error: 'Error al consultar secciones' });
    }
});


// Iniciar el servidor en el puerto 3000
app.listen(3000, () => {
    console.log('Servidor backend encendido en http://localhost:3000');
});