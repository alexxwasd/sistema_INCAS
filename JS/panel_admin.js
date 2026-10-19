const adminApiUrl = "http://localhost:3000/api/admin";

document.addEventListener("DOMContentLoaded", () => {
    cargarDocentes();
    cargarAlumnos();
    cargarEncargados();
    cargarSecciones();
    cargarAnios();
    cargarDocentesGuia();
    cargarEspecialidades();

    document.querySelector("#teacher-create-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        crearRegistro(event.currentTarget, "/docentes", "#teacher-create-status", async () => {
            await cargarDocentes();
            await cargarDocentesGuia(); // Recarga la lista de docentes guía para el selector de secciones
        });
    });

    document.querySelector("#section-create-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        crearRegistro(event.currentTarget, "/secciones", "#section-create-status", cargarSecciones);
    });
});

// -------------------------------------------------------------
// FUNCIONES AUXILIARES PARA TABLAS
// -------------------------------------------------------------

function renderizarTabla(tablaId, lista, columnas, mensajeVacio) {
    const tbody = document.querySelector(`#${tablaId} tbody`);
    if (!tbody) return;

    tbody.replaceChildren();

    if (!lista || !lista.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = columnas.length;
        cell.textContent = mensajeVacio;
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    lista.forEach((item) => {
        const row = document.createElement("tr");
        columnas.forEach((column) => {
            const cell = document.createElement("td");
            cell.textContent = item[column] ?? "N/A";
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
}

function mostrarErrorTabla(tablaId, cantidadColumnas, mensaje) {
    const tbody = document.querySelector(`#${tablaId} tbody`);
    if (!tbody) return;

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = cantidadColumnas;
    cell.textContent = mensaje;
    row.appendChild(cell);
    tbody.replaceChildren(row);
}

async function cargarDatosTabla(endpoint, tablaId, columnas, mensajeVacio) {
    try {
        const response = await fetch(`${adminApiUrl}/${endpoint}`);
        const data = await response.json();

        if (!response.ok || !data.success || !Array.isArray(data.datos)) {
            throw new Error(data.error || "No se pudieron cargar los datos.");
        }

        renderizarTabla(tablaId, data.datos, columnas, mensajeVacio);
        return true;
    } catch (error) {
        console.error(`Error cargando ${endpoint}:`, error);
        mostrarErrorTabla(tablaId, columnas.length, "No se pudieron cargar los datos.");
        return false;
    }
}

// -------------------------------------------------------------
// CARGA DE TABLAS ESPECÍFICAS
// -------------------------------------------------------------

function cargarDocentes() {
    return cargarDatosTabla(
        "docentes",
        "tabla-docentes",
        ["identificador", "dui_docente", "nombre", "apellido", "especialidad"],
        "No hay docentes registrados."
    );
}

function cargarAlumnos() {
    return cargarDatosTabla(
        "alumnos",
        "tabla-alumnos",
        ["identificador", "nie", "nombre", "apellido", "nombre_seccion"],
        "No hay alumnos registrados."
    );
}

function cargarEncargados() {
    return cargarDatosTabla(
        "encargados",
        "tabla-encargados",
        ["identificador", "dui_encargado", "nombre", "apellido", "telefono"],
        "No hay encargados registrados."
    );
}

function cargarSecciones() {
    return cargarDatosTabla(
        "secciones",
        "tabla-secciones",
        ["id_seccion", "nombre_seccion", "anio", "docente_guia"],
        "No hay secciones creadas."
    );
}

// -------------------------------------------------------------
// CARGA DE DESPLEGABLES (SELECTS)
// -------------------------------------------------------------

async function cargarAnios() {
    const select = document.querySelector("#select-anio");
    if (!select) return;

    try {
        const response = await fetch(`${adminApiUrl}/anios`);
        const data = await response.json();

        if (!response.ok || !data.success || !Array.isArray(data.datos)) {
            throw new Error(data.error || "No se pudieron cargar los años.");
        }

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Seleccione el año...";
        placeholder.disabled = true;
        placeholder.selected = true;
        select.replaceChildren(placeholder);

        data.datos.forEach((anio) => {
            if (anio.id_anio === undefined || anio.id_anio === null || !anio.nombre_anio) return;

            const option = document.createElement("option");
            option.value = String(anio.id_anio);
            option.textContent = String(anio.nombre_anio);
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando años:", error);
        const status = document.querySelector("#section-create-status");
        if (status) {
            status.className = "teacher-create-status error";
            status.textContent = "No se pudieron cargar los años. Recarga la página para intentarlo de nuevo.";
        }
    }
}

async function cargarDocentesGuia() {
    const select = document.querySelector("#select-docente-guia");
    if (!select) return;

    try {
        const response = await fetch(`${adminApiUrl}/docentes`);
        const data = await response.json();

        if (!response.ok || !data.success || !Array.isArray(data.datos)) {
            throw new Error(data.error || "No se pudieron cargar los docentes.");
        }

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Seleccione un docente guía...";
        placeholder.disabled = true;
        placeholder.selected = true;
        select.replaceChildren(placeholder);

        data.datos.forEach((docente) => {
            if (!docente.dui_docente || (!docente.nombre && !docente.apellido)) return;

            const option = document.createElement("option");
            option.value = String(docente.dui_docente);
            option.textContent = `${docente.nombre || ''} ${docente.apellido || ''} (${docente.dui_docente})`.trim();
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando docentes guía:", error);
        const status = document.querySelector("#section-create-status");
        if (status) {
            status.className = "teacher-create-status error";
            status.textContent = "No se pudieron cargar los docentes guía. Recarga la página para intentarlo de nuevo.";
        }
    }
}

async function cargarEspecialidades() {
    const select = document.querySelector("#select-especialidad");
    if (!select) return;

    try {
        const response = await fetch(`${adminApiUrl}/especialidades`);
        const data = await response.json();

        if (!response.ok || !data.success || !Array.isArray(data.datos)) {
            throw new Error(data.error || "No se pudieron cargar las especialidades.");
        }

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Seleccione una especialidad...";
        placeholder.disabled = true;
        placeholder.selected = true;
        select.replaceChildren(placeholder);

        data.datos.forEach((especialidad) => {
            const id = especialidad.id_especialidad ?? especialidad.id;
            const nombre = especialidad.nombre_especialidad ?? especialidad.nombre ?? especialidad.especialidad;

            if (id === undefined || id === null || !nombre) return;

            const option = document.createElement("option");
            option.value = String(id).trim(); // Guarda el ID numérico
            option.textContent = String(nombre).trim(); // Muestra el nombre visible
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error cargando especialidades:", error);
        const status = document.querySelector("#teacher-create-status");
        if (status) {
            status.className = "teacher-create-status error";
            status.textContent = "No se pudieron cargar las especialidades. Recarga la página para intentarlo de nuevo.";
        }
    }
}

// -------------------------------------------------------------
// ENVÍO DE FORMULARIOS (POST)
// -------------------------------------------------------------

async function crearRegistro(form, endpoint, statusSelector, recargarTabla) {
    const status = document.querySelector(statusSelector);
    const submitButton = form.querySelector("button[type='submit']");
    const formData = Object.fromEntries(new FormData(form).entries());

    // Convertir id_especialidad e id_anio a tipo entero para la BD
    if (formData.id_especialidad) {
        formData.id_especialidad = parseInt(formData.id_especialidad, 10);
    }
    if (formData.especialidad && !isNaN(parseInt(formData.especialidad, 10))) {
        formData.id_especialidad = parseInt(formData.especialidad, 10);
    }
    if (formData.id_anio) {
        formData.id_anio = parseInt(formData.id_anio, 10);
    }
    if (formData.grado && !isNaN(parseInt(formData.grado, 10))) {
        formData.id_anio = parseInt(formData.grado, 10);
    }

    ["telefono", "direccion", "fecha_nac"].forEach((campo) => {
        if (typeof formData[campo] === "string" && formData[campo].trim() === "") {
            formData[campo] = null;
        }
    });

    if (status) {
        status.className = "teacher-create-status";
        status.textContent = "Guardando...";
    }
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(`${adminApiUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "No se pudo guardar el registro.");
        }

        form.reset();
        if (status) {
            status.className = "teacher-create-status success";
            status.textContent = data.mensaje || "Registro guardado correctamente.";
        }

        if (typeof recargarTabla === "function") {
            await recargarTabla();
        }
    } catch (error) {
        console.error(`Error creando ${endpoint}:`, error);
        if (status) {
            status.className = "teacher-create-status error";
            status.textContent = error.message || "No se pudo guardar el registro.";
        }
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}