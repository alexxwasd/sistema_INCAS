// Controles para cambiar entre la información personal y las notas del alumno.
const navigationButtons = document.querySelectorAll(".nav-link");
const contentViews = document.querySelectorAll(".content-view");
const periodSelect = document.querySelector("#period-select");
const gradesBody = document.querySelector("#grades-body");

let studentPeriods = [];

navigationButtons.forEach((button) => {
    button.addEventListener("click", () => {
        // El valor data-view del botón coincide con el sufijo del id de la sección.
        const selectedView = button.dataset.view;

        navigationButtons.forEach((item) => {
            item.classList.remove("active");
            item.removeAttribute("aria-current");
        });

        contentViews.forEach((view) => {
            view.hidden = view.id !== `view-${selectedView}`;
            view.classList.toggle("active", !view.hidden);
        });

        button.classList.add("active");
        button.setAttribute("aria-current", "page");
    });
});

// Presenta los datos personales devueltos por la API protegida del alumno.
function renderStudentProfile(student) {
    document.querySelectorAll("[data-student-field]").forEach((field) => {
        const value = student[field.dataset.studentField];
        field.textContent = value === null || value === undefined || value === ""
            ? "No disponible"
            : String(value);
    });
}

// Muestra exclusivamente los períodos cerrados que el servidor entregó.
function renderStudentGrades() {
    const period = studentPeriods.find(
        (item) => item.finalizado && String(item.id) === periodSelect.value
    );
    gradesBody.replaceChildren();

    if (!period || period.notas.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "empty-cell";
        cell.colSpan = 2;
        cell.textContent = "No hay notas disponibles para este período finalizado.";
        row.append(cell);
        gradesBody.append(row);
        return;
    }

    period.notas.forEach((grade) => {
        const row = document.createElement("tr");
        const subject = document.createElement("td");
        const score = document.createElement("td");
        subject.textContent = grade.materia;
        score.textContent = grade.nota === null ? "No disponible" : String(grade.nota);
        row.append(subject, score);
        gradesBody.append(row);
    });
}

// Carga datos de la sesión; el servidor determina el alumno mediante su cuenta.
async function loadStudentProfile() {
    try {
        const response = await fetch("api/student_portal.php", {
            headers: { Accept: "application/json" }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "No se pudo cargar el perfil.");
        }

        renderStudentProfile(result.student);
        studentPeriods = result.periods.filter((period) => period.finalizado);
        periodSelect.replaceChildren();

        if (studentPeriods.length === 0) {
            periodSelect.append(new Option("No hay períodos finalizados disponibles", ""));
            periodSelect.disabled = true;
            renderStudentGrades();
            return;
        }

        studentPeriods.forEach((period, index) => {
            periodSelect.append(new Option(period.nombre, String(period.id)));
            if (index === 0) {
                periodSelect.value = String(period.id);
            }
        });
        periodSelect.disabled = false;
        renderStudentGrades();
    } catch (error) {
        gradesBody.replaceChildren();
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "empty-cell";
        cell.colSpan = 2;
        cell.textContent = error.message || "No se pudieron cargar los datos.";
        row.append(cell);
        gradesBody.append(row);
    }
}

periodSelect.addEventListener("change", renderStudentGrades);
loadStudentProfile();
