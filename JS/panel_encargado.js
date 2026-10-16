// Elementos que controlan la navegación, el alumno seleccionado y sus notas.
const navigationButtons = document.querySelectorAll(".nav-link");
const contentViews = document.querySelectorAll(".content-view");
const studentList = document.querySelector("#students-list");
const periodSelect = document.querySelector("#period-select");
const gradesBody = document.querySelector("#grades-body");

let selectedStudent = null;

// Muestra la vista pedida y marca como activa la sección principal correspondiente.
function showView(viewName) {
    const selectedView = viewName === "alumno-detalle" ? "alumnos" : viewName;

    contentViews.forEach((view) => {
        view.hidden = view.id !== `view-${viewName}`;
        view.classList.toggle("active", !view.hidden);
    });

    navigationButtons.forEach((button) => {
        const isActive = button.dataset.view === selectedView;
        button.classList.toggle("active", isActive);

        if (isActive) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });
}

// Escribe valores como texto plano en las casillas indicadas por los atributos data-*.
function setFieldValues(container, values) {
    container.querySelectorAll("[data-student-field], [data-guardian-field]").forEach((field) => {
        const key = field.dataset.studentField || field.dataset.guardianField;
        const value = values[key];
        field.textContent = value === null || value === undefined || value === ""
            ? "No disponible"
            : String(value);
    });
}

// Filtra los períodos abiertos para que la familia solo consulte resultados publicados.
function renderGrades(periods) {
    const completedPeriods = periods.filter((period) => period.finalizado === true);

    periodSelect.replaceChildren();

    if (completedPeriods.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No hay períodos finalizados disponibles";
        periodSelect.append(option);
        periodSelect.disabled = true;
        renderGradeRows([]);
        return;
    }

    completedPeriods.forEach((period, index) => {
        const option = document.createElement("option");
        option.value = String(period.id);
        option.textContent = period.nombre;
        periodSelect.append(option);

        if (index === 0) {
            periodSelect.value = option.value;
        }
    });

    periodSelect.disabled = false;
    renderSelectedPeriodGrades();
}

// Crea filas de la tabla usando nodos de texto, no HTML proveniente de los datos.
function renderGradeRows(grades) {
    gradesBody.replaceChildren();

    if (grades.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "empty-cell";
        cell.colSpan = 2;
        cell.textContent = "No hay notas disponibles para este período.";
        row.append(cell);
        gradesBody.append(row);
        return;
    }

    grades.forEach((grade) => {
        const row = document.createElement("tr");
        const subjectCell = document.createElement("td");
        const gradeCell = document.createElement("td");

        subjectCell.textContent = grade.materia;
        gradeCell.textContent = grade.nota === null || grade.nota === undefined
            ? "No disponible"
            : String(grade.nota);

        row.append(subjectCell, gradeCell);
        gradesBody.append(row);
    });
}

// Refresca la tabla según el período seleccionado para el alumno actual.
function renderSelectedPeriodGrades() {
    if (!selectedStudent || periodSelect.disabled) {
        renderGradeRows([]);
        return;
    }

    const period = selectedStudent.periodos.find(
        (item) => item.finalizado === true && String(item.id) === periodSelect.value
    );

    renderGradeRows(period?.notas ?? []);
}

// Recupera la tarjeta seleccionada, carga su información y abre el expediente.
function openStudent(studentId) {
    const student = Array.from(studentList.querySelectorAll("[data-student-id]"))
        .find((card) => card.dataset.studentId === studentId)?.studentData;

    if (!student) {
        return;
    }

    selectedStudent = student;
    setFieldValues(
        document.querySelector("#selected-student-information"),
        selectedStudent
    );
    renderGrades(selectedStudent.periodos);
    showView("alumno-detalle");
}

navigationButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-view='alumnos']:not(.nav-link)").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
});

studentList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-student-id]");

    if (card && studentList.contains(card)) {
        openStudent(card.dataset.studentId);
    }
});

periodSelect.addEventListener("change", renderSelectedPeriodGrades);

// Carga la cuenta y sus alumnos desde la API según el DUI autenticado en la sesión.
async function loadGuardianPortalData() {
    try {
        const response = await fetch("api/guardian_portal.php", {
            headers: { Accept: "application/json" }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "No se pudo cargar la información familiar.");
        }
        window.renderGuardianPortalData(result.guardian, result.students);
    } catch (error) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = error.message || "No se pudo conectar con el servidor.";
        studentList.replaceChildren(message);
    }
}

// Punto de integración: el futuro backend entregará los datos con esta estructura.
window.renderGuardianPortalData = (guardian, students) => {
    if (!guardian || typeof guardian !== "object" || Array.isArray(guardian)) {
        throw new TypeError("La información del encargado debe ser un objeto.");
    }

    if (!Array.isArray(students)) {
        throw new TypeError("La lista de alumnos debe ser un arreglo.");
    }

    students.forEach((student) => {
        if (!student || typeof student !== "object" || student.id === null || student.id === undefined) {
            throw new TypeError("Cada alumno debe tener información e identificador.");
        }

        if (!Array.isArray(student.periodos)) {
            throw new TypeError("Cada alumno debe incluir un arreglo de períodos.");
        }

        student.periodos.forEach((period) => {
            if (!period || typeof period !== "object" || !Array.isArray(period.notas)) {
                throw new TypeError("Cada período debe incluir una lista de notas.");
            }
        });
    });

    setFieldValues(document.querySelector("#guardian-information"), guardian);
    studentList.replaceChildren();
    selectedStudent = null;
    showView("encargado");

    if (students.length === 0) {
        const message = document.createElement("p");
        message.className = "empty-message";
        message.textContent = "No hay alumnos matriculados asociados a este encargado.";
        studentList.append(message);
        return;
    }

    students.forEach((student) => {
        const fullName = [student.nombre, student.apellido].filter(Boolean).join(" ");
        const button = document.createElement("button");
        const avatar = document.createElement("span");
        const name = document.createElement("span");

        button.type = "button";
        button.className = "student-card";
        button.dataset.studentId = String(student.id);
        button.setAttribute("aria-label", `Ver información y notas de ${fullName || "alumno"}`);
        button.studentData = student;

        avatar.className = "student-avatar";
        avatar.setAttribute("aria-hidden", "true");
        avatar.textContent = fullName.charAt(0).toLocaleUpperCase("es") || "?";

        name.className = "student-name";
        name.textContent = fullName || "Alumno";

        button.append(avatar, name);
        studentList.append(button);
    });
};

loadGuardianPortalData();