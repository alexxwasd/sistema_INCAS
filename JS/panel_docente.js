// Referencias a la navegación, listas, tabla de notas y mensajes del docente.
const navigationButtons = document.querySelectorAll(".nav-link");
const contentViews = document.querySelectorAll(".content-view");
const sectionList = document.querySelector("#sections-list");
const rosterList = document.querySelector("#roster-list");
const rosterHeading = document.querySelector("#roster-heading");
const gradeSectionSelect = document.querySelector("#grade-section-select");
const gradeRows = document.querySelector("#grade-rows");
const saveButton = document.querySelector("#save-grades");
const saveStatus = document.querySelector("#save-status");

let assignedSections = [];
let selectedSection = null;

// Cambia de vista y mantiene sincronizado el botón activo del menú.
function showView(viewName) {
    contentViews.forEach((view) => {
        view.hidden = view.id !== `view-${viewName}`;
        view.classList.toggle("active", !view.hidden);
    });

    navigationButtons.forEach((button) => {
        const isActive = button.dataset.view === viewName;
        button.classList.toggle("active", isActive);

        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });
}

// Completa la ficha con los datos del docente y las secciones recibidas.
function setTeacherInformation(teacher) {
    document.querySelectorAll("[data-teacher-field]").forEach((field) => {
        const key = field.dataset.teacherField;
        let value = teacher[key];

        if (key === "secciones") {
            value = assignedSections.map((section) => section.nombre).filter(Boolean).join(", ");
        }

        field.textContent = value === null || value === undefined || value === ""
            ? "No disponible"
            : String(value);
    });
}

// Muestra una fila explicativa cuando todavía no hay notas para editar.
function showEmptyRow(message) {
    gradeRows.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "empty-cell";
    cell.colSpan = 5;
    cell.textContent = message;
    row.append(cell);
    gradeRows.append(row);
}

// Selecciona una sección y prepara su lista de alumnos o el ingreso de notas.
function selectSection(sectionId, viewName = "alumnos") {
    selectedSection = assignedSections.find((section) => String(section.id) === sectionId);

    if (!selectedSection) {
        return;
    }

    rosterHeading.textContent = `Alumnos de la sección ${selectedSection.nombre}`;
    rosterList.replaceChildren();

    if (selectedSection.alumnos.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "Esta sección todavía no tiene alumnos disponibles.";
        rosterList.append(message);
    } else {
        selectedSection.alumnos.forEach((student) => {
            const card = document.createElement("article");
            const avatar = document.createElement("span");
            const name = document.createElement("span");

            card.className = "student-card";
            avatar.className = "student-avatar";
            avatar.setAttribute("aria-hidden", "true");
            name.className = "student-name";
            name.textContent = [student.nombre, student.apellido].filter(Boolean).join(" ") || "Alumno";
            avatar.textContent = name.textContent.charAt(0).toLocaleUpperCase("es") || "?";
            card.append(avatar, name);
            rosterList.append(card);
        });
    }

    gradeSectionSelect.value = String(selectedSection.id);
    renderGradeInputs();
    showView(viewName);
}

// Construye cuatro campos por alumno: tres actividades y un examen.
function renderGradeInputs() {
    gradeRows.replaceChildren();
    saveStatus.textContent = "";
    saveButton.disabled = !selectedSection || selectedSection.alumnos.length === 0;

    if (!selectedSection || selectedSection.alumnos.length === 0) {
        showEmptyRow("Selecciona una sección que tenga alumnos para ingresar sus notas.");
        return;
    }

    selectedSection.alumnos.forEach((student) => {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        nameCell.textContent = [student.nombre, student.apellido].filter(Boolean).join(" ") || "Alumno";
        row.append(nameCell);

        for (let index = 0; index < 4; index++) {
            const cell = document.createElement("td");
            const input = document.createElement("input");
            const score = index < 3 ? student.actividades[index] : student.examen;

            input.className = "grade-input";
            input.type = "number";
            input.min = "0";
            input.max = "10";
            input.step = "0.1";
            input.required = true;
            input.inputMode = "decimal";
            input.setAttribute("aria-label", `${index < 3 ? `Actividad ${index + 1}` : "Examen"} de ${nameCell.textContent}`);
            input.dataset.studentId = String(student.id);
            input.dataset.scoreType = index < 3 ? `actividad-${index + 1}` : "examen";
            input.value = score === null || score === undefined ? "" : String(score);
            input.addEventListener("input", () => {
                saveStatus.textContent = "";
            });
            cell.append(input);
            row.append(cell);
        }

        gradeRows.append(row);
    });
}

// Carga en el selector las secciones que el backend asignó al docente.
function populateSelect() {
    gradeSectionSelect.replaceChildren();

    if (assignedSections.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No hay secciones asignadas disponibles";
        gradeSectionSelect.append(option);
        gradeSectionSelect.disabled = true;
        return;
    }

    assignedSections.forEach((section) => {
        const option = document.createElement("option");
        option.value = String(section.id);
        option.textContent = section.nombre;
        gradeSectionSelect.append(option);
    });

    gradeSectionSelect.disabled = false;
    gradeSectionSelect.value = String(assignedSections[0].id);
}

// Dibuja las tarjetas de las secciones y conecta cada una con su lista.
function renderSections() {
    sectionList.replaceChildren();

    if (assignedSections.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "Este docente todavía no tiene secciones asignadas.";
        sectionList.append(message);
        return;
    }

    assignedSections.forEach((section) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "section-card";
        button.dataset.sectionId = String(section.id);
        button.textContent = section.nombre;
        button.addEventListener("click", () => selectSection(String(section.id)));
        sectionList.append(button);
    });
}

// Convierte los valores de la tabla en el formato esperado por el futuro endpoint.
function collectGrades() {
    if (!selectedSection) {
        return null;
    }

    return {
        seccionId: selectedSection.id,
        alumnos: selectedSection.alumnos.map((student) => {
            const activities = [1, 2, 3].map((activityNumber) => {
                const input = gradeRows.querySelector(
                    `[data-student-id="${CSS.escape(String(student.id))}"][data-score-type="actividad-${activityNumber}"]`
                );
                return input.value === "" ? null : Number(input.value);
            });
            const examInput = gradeRows.querySelector(
                `[data-student-id="${CSS.escape(String(student.id))}"][data-score-type="examen"]`
            );

            return {
                alumnoId: student.id,
                actividades: activities,
                examen: examInput.value === "" ? null : Number(examInput.value)
            };
        })
    };
}

navigationButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-view]:not(.nav-link)").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
});

gradeSectionSelect.addEventListener("change", () => {
    selectSection(gradeSectionSelect.value, "notas");
});

// Valida la escala 0–10 y usa un servicio solo si una integración lo proporciona.
saveButton.addEventListener("click", async () => {
    saveStatus.textContent = "";

    const inputs = gradeRows.querySelectorAll(".grade-input");
    for (const input of inputs) {
        if (!input.checkValidity()) {
            input.reportValidity();
            return;
        }
    }

    const grades = collectGrades();
    if (!grades) {
        return;
    }

    if (typeof window.saveTeacherGrades !== "function") {
        saveStatus.textContent = "El guardado se habilitará cuando se conecte la base de datos.";
        return;
    }

    saveButton.disabled = true;
    saveStatus.textContent = "Guardando notas…";

    try {
        await window.saveTeacherGrades(grades);
        saveStatus.textContent = "Las notas se guardaron correctamente.";
    } catch (error) {
        saveStatus.textContent = "No se pudieron guardar las notas. Inténtalo de nuevo.";
        console.error("Error al guardar las notas:", error);
    } finally {
        saveButton.disabled = false;
    }
});

// Punto de integración para entregar la ficha, secciones, alumnos y notas existentes.
window.renderTeacherPortalData = (teacher, sections) => {
    if (!teacher || typeof teacher !== "object" || Array.isArray(teacher)) {
        throw new TypeError("La información del docente debe ser un objeto.");
    }

    if (!Array.isArray(sections)) {
        throw new TypeError("Las secciones asignadas deben ser un arreglo.");
    }

    sections.forEach((section) => {
        if (!section || typeof section !== "object" || section.id === null || section.id === undefined) {
            throw new TypeError("Cada sección debe tener información e identificador.");
        }

        if (!Array.isArray(section.alumnos)) {
            throw new TypeError("Cada sección debe incluir un arreglo de alumnos.");
        }

        section.alumnos.forEach((student) => {
            if (!student || typeof student !== "object" || student.id === null || student.id === undefined) {
                throw new TypeError("Cada alumno debe tener información e identificador.");
            }

            if (!Array.isArray(student.actividades) || student.actividades.length !== 3) {
                throw new TypeError("Cada alumno debe incluir exactamente tres notas de actividades.");
            }

            [...student.actividades, student.examen].forEach((score) => {
                if (score !== null && score !== undefined && (typeof score !== "number" || score < 0 || score > 10)) {
                    throw new RangeError("Las notas deben estar entre 0 y 10.");
                }
            });
        });
    });

    assignedSections = sections;
    selectedSection = null;
    setTeacherInformation(teacher);
    renderSections();
    populateSelect();
    showEmptyRow("Selecciona una sección con alumnos para ingresar sus notas.");
    saveButton.disabled = true;
    showView("informacion");
};