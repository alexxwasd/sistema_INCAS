const { Pool } = require('pg');

const p = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sistema_incas',
    password: 'software',
    port: 5432,
});

(async () => {
    const emptyPayload = {
        dui: `${String(Date.now()).slice(-8)}-2`,
        nombre: 'Nulos',
        apellido: 'Opcionales',
        correo: `docente.nulos.${Date.now()}@incas.edu.sv`,
        id_especialidad: 6,
        telefono: '   ',
        direccion: '',
        fecha_nac: ''
    };

    const createResponse = await fetch('http://localhost:3000/api/admin/docentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyPayload)
    });
    const createBody = await createResponse.json();
    console.log('EMPTY_STATUS', createResponse.status, createBody);

    const saved = await p.query(
        `SELECT correo, direccion, telefono, fecha_nac, id_especialidad
         FROM docente
         WHERE correo = $1`,
        [emptyPayload.correo]
    );
    console.log('EMPTY_ROW', JSON.stringify(saved.rows, null, 2));

    const correos = [
        emptyPayload.correo,
        'ana.lopez.ui@incas.edu.sv'
    ];

    await p.query(
        `DELETE FROM docente
         WHERE correo = ANY($1::text[])
            OR dui_docente IN ('87654321-0', '68041109-1')
            OR correo LIKE 'docente.prueba.%'
            OR correo LIKE 'docente.nulos.%'`,
        [correos]
    );
    await p.query(
        `DELETE FROM usuarios
         WHERE identificador = ANY($1::text[])
            OR identificador LIKE 'docente.prueba.%'
            OR identificador LIKE 'docente.nulos.%'`,
        [correos]
    );

    await p.end();
})().catch(async (error) => {
    console.error(error);
    await p.end();
    process.exit(1);
});
