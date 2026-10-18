const steps = document.querySelectorAll(".form-step");
const nextButtons = document.querySelectorAll(".btn-next");
const previousButtons = document.querySelectorAll(".btn-prev");
const progressSteps = document.querySelectorAll(".step");
const form = document.querySelector(".form");
const bachelorType = document.querySelector("#tipo-bachillerato");
const specialty = document.querySelector("#especialidad");
const specialtyStatus = document.querySelector("#specialty-status");
const reviewSummary = document.querySelector("#review-summary");
const submitStatus = document.querySelector("#submit-status");
const birthDate = form.elements.namedItem("fecha_nac_est");

let currentStep = 0;

birthDate.max = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

function updateSpecialtyField() {
    specialty.disabled = true;
    specialty.required = false;
    specialty.value = "";
    specialtyStatus.textContent = bachelorType.value === "Técnico"
        ? "La lista de especialidades todavía no está configurada."
        : "";
}

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
        } else if (field === specialty && bachelorType.value === "Técnico") {
            value = "Pendiente de configurar";
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

function showStep(index) {
    steps.forEach((step) => step.classList.remove("active"));
    progressSteps.forEach((step) => {
        step.classList.remove("active");
        step.removeAttribute("aria-current");
    });

    steps[index].classList.add("active");
    progressSteps[index].setAttribute("aria-current", "step");

    for (let step = 0; step <= index; step++) {
        progressSteps[step].classList.add("active");
    }
}

nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
        if (currentStep >= steps.length - 1) {
            return;
        }

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
    });
});

previousButtons.forEach((button) => {
    button.addEventListener("click", () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });
});

bachelorType.addEventListener("change", updateSpecialtyField);

form.addEventListener("submit", (event) => {
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

    submitStatus.className = "submit-status full-width";
    submitStatus.textContent = "Formulario de demostración: la solicitud no se ha enviado.";
});

updateSpecialtyField();
showStep(currentStep);
