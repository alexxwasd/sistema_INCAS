// Elementos del formulario y estado del paso que el usuario tiene abierto.
const steps = document.querySelectorAll(".form-step");
const nextBtn = document.querySelectorAll(".btn-next");
const prevBtn = document.querySelectorAll(".btn-prev");
const progressSteps = document.querySelectorAll(".step");
const form = document.querySelector(".form");
const bachelorType = document.querySelector("#tipo-bachillerato");
const specialty = document.querySelector("#especialidad");
const specialtyStatus = document.querySelector("#specialty-status");
const reviewSummary = document.querySelector("#review-summary");
const submitStatus = document.querySelector("#submit-status");
const submitButton = form.querySelector(".btn-submit");
const birthDate = form.elements.namedItem("fecha_nac_est");

let currentStep = 0;

// Evita que el navegador acepte por accidente una fecha de nacimiento futura.
birthDate.max = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

// La especialidad solo se solicita si se eligió bachillerato Técnico.
function updateSpecialtyField() {
    const requiresSpecialty = bachelorType.value === "Técnico";
    specialty.disabled = !requiresSpecialty;
    specialty.required = requiresSpecialty;

    if (!requiresSpecialty) {
        specialty.value = "";
    }
}

// Copia a la pantalla de confirmación los valores escritos y los nombres de archivos.
function updateReview() {
    const reviewFields = [
        ["nombre_est", "Nombre del alumno"],
        ["apellido_est", "Apellido del alumno"],
        ["fecha_nac_est", "Fecha de nacimiento"],
        ["correo_est", "Correo institucional"],
        ["telefono_est", "Teléfono del alumno"],
        ["direccion_est", "Dirección del alumno"],
        ["tipo_bachillerato", "Tipo de bachillerato"],
        ["id_especialidad", "Especialidad"],
        ["nombre_rep", "Nombre del encargado"],
        ["apellido_rep", "Apellido del encargado"],
        ["dui_rep", "DUI del encargado"],
        ["telefono_rep", "Teléfono del encargado"],
        ["partida_nacimiento", "Partida de nacimiento"],
        ["notas_grado_anterior", "Notas del grado anterior"],
        ["carta_conducta", "Carta de buena conducta"]
    ];

    reviewSummary.replaceChildren();

    reviewFields.forEach(([fieldName, label]) => {
        const field = form.elements.namedItem(fieldName);
        let value;

        if (field instanceof HTMLInputElement && field.type === "file") {
            value = field.files[0]?.name || "No se seleccionó archivo";
        } else if (field instanceof HTMLSelectElement && !field.value) {
            value = "No aplica";
        } else {
            value = field.value.trim();
        }

        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        reviewSummary.append(term, description);
    });
}

// Deja visible el paso elegido y mantiene sincronizados los indicadores de progreso.
function showStep(index) {
    steps.forEach((step) => step.classList.remove("active"));
    progressSteps.forEach((step) => {
        step.classList.remove("active");
        step.removeAttribute("aria-current");
    });

    steps[index].classList.add("active");
    progressSteps[index].setAttribute("aria-current", "step");

    for (let i = 0; i <= index; i++) {
        progressSteps[i].classList.add("active");
    }
}

// Antes de avanzar, pide al navegador validar todos los campos del paso actual.
nextBtn.forEach((button) => {
    button.addEventListener("click", () => {
        if (currentStep < steps.length - 1) {
            const fields = steps[currentStep].querySelectorAll("input, select, textarea");

            for (const field of fields) {
                if (!field.checkValidity()) {
                    field.reportValidity();
                    return;
                }
            }

            if (currentStep === 1) {
                updateReview();
            }

            currentStep++;
            showStep(currentStep);
            submitStatus.textContent = "";
        }
    });
});

// Permite regresar al paso anterior sin borrar lo que el usuario ya escribió.
prevBtn.forEach((button) => {
    button.addEventListener("click", () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });
});

bachelorType.addEventListener("change", updateSpecialtyField);

// Recibe el catálogo del servidor y crea opciones sin interpretar datos como HTML.
window.populateEnrollmentSpecialties = (specialties) => {
    if (!Array.isArray(specialties)) {
        throw new TypeError("Las especialidades deben proporcionarse en una lista.");
    }

    specialties.forEach((item) => {
        if (!item || item.id === null || item.id === undefined || typeof item.nombre !== "string" || !item.nombre.trim()) {
            throw new TypeError("Cada especialidad debe tener un identificador y un nombre.");
        }
    });

    specialty.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = specialties.length
        ? "Seleccione una especialidad"
        : "No hay especialidades disponibles";
    specialty.append(placeholder);

    specialties.forEach((item) => {
        const option = document.createElement("option");
        option.value = String(item.id);
        option.textContent = item.nombre;
        specialty.append(option);
    });

    updateSpecialtyField();
};

// Consulta al servidor la lista real de especialidades de la base de datos.
async function loadSpecialties() {
    try {
        const response = await fetch("api/especialidades.php", {
            headers: { Accept: "application/json" }
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "No se pudieron cargar las especialidades.");
        }

        window.populateEnrollmentSpecialties(result.specialties);
        specialtyStatus.textContent = result.specialties.length
            ? ""
            : "No hay especialidades registradas. El bachillerato Técnico estará disponible cuando se agreguen en la base de datos.";
    } catch (error) {
        specialty.replaceChildren(new Option("No se pudieron cargar las especialidades", ""));
        specialty.disabled = true;
        specialtyStatus.textContent = error.message || "No se pudieron cargar las especialidades. Recarga la página o inténtalo más tarde.";
    }
}

// Valida todos los pasos y envía textos y documentos al endpoint en una sola petición.
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    for (let index = 0; index < steps.length; index++) {
        const fields = steps[index].querySelectorAll("input, select, textarea");
        for (const field of fields) {
            if (!field.checkValidity()) {
                currentStep = index;
                showStep(currentStep);
                field.reportValidity();
                return;
            }
        }
    }

    submitButton.disabled = true;
    submitStatus.className = "submit-status full-width";
    submitStatus.textContent = "Enviando solicitud...";

    try {
        const response = await fetch("api/matricula.php", {
            method: "POST",
            body: new FormData(form),
            headers: { Accept: "application/json" }
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "No se pudo guardar la solicitud.");
        }

        submitStatus.classList.add("success");
        submitStatus.textContent = `${result.message} Número de solicitud: ${result.id}.`;
        submitButton.textContent = "Solicitud enviada";
    } catch (error) {
        submitStatus.classList.add("error");
        submitStatus.textContent = error.message || "No se pudo conectar con el servidor. Inténtalo de nuevo.";
        submitButton.disabled = false;
    }
});

// Estado inicial: configuración condicional, primer paso y catálogo del servidor.
updateSpecialtyField();
showStep(currentStep);
loadSpecialties();