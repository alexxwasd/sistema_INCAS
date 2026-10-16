// Elementos de navegación y listas que reciben datos reales del servidor.
const navigationButtons = document.querySelectorAll(".nav-link");
const contentViews = document.querySelectorAll(".content-view");
const applicationsList = document.querySelector("#applications-list");
const teachersList = document.querySelector("#teachers-list");
const guardiansList = document.querySelector("#guardians-list");
const sectionsList = document.querySelector("#sections-list");
const adminStatus = document.querySelector("#admin-status");
const logoutButton = document.querySelector("#admin-logout");
const teacherForm = document.querySelector("#teacher-create-form");
const teacherCreateStatus = document.querySelector("#teacher-create-status");

let csrfToken = "";

// Muestra la vista elegida y actualiza el estado visual y accesible del menú.
function showView(viewName) {
    navigationButtons.forEach((button) => {
        const active = button.dataset.view === viewName;
        button.classList.toggle("active", active);
        if (active) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    contentViews.forEach((view) => {
        view.hidden = view.id !== `view-${viewName}`;
        view.classList.toggle("active", !view.hidden);
    });
}

// Construye una celda de ficha usando texto plano para mostrar valores de la base.
function addDetail(details, label, value) {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value === null || value === undefined || value === ""
        ? "No disponible"
        : String(value);
    wrapper.append(term, description);
    details.append(wrapper);
}

// Presenta el formulario de asignación con secciones existentes en la base de datos.
function createApprovalForm(application, sections) {
    const form = document.createElement("form");
    const nieLabel = document.createElement("label");
    const nieInput = document.createElement("input");
    const sectionLabel = document.createElement("label");
    const sectionSelect = document.createElement("select");
    const submit = document.createElement("button");
    const allowedSections = application.tipo_bachillerato === "Técnico"
        ? sections.filter((section) => Number(section.id_especialidad) === Number(application.id_especialidad))
        : sections;

    form.className = "approval-form";
    form.dataset.applicationId = String(application.id);

    nieInput.name = "nie";
    nieInput.inputMode = "numeric";
    nieInput.pattern = "[0-9]{1,10}";
    nieInput.maxLength = 10;
    nieInput.placeholder = "NIE asignado por el instituto";
    nieInput.required = true;
    nieLabel.append("NIE del alumno", nieInput);

    sectionSelect.name = "seccion_id";
    sectionSelect.required = true;
    const placeholder = new Option(
        allowedSections.length ? "Selecciona una sección" : "No hay secciones compatibles registradas",
        ""
    );
    sectionSelect.append(placeholder);
    allowedSections.forEach((section) => {
        sectionSelect.append(new Option(
            `${section.nombre} - ${section.especialidad}`,
            String(section.id)
        ));
    });
    sectionLabel.append("Sección", sectionSelect);

    submit.type = "submit";
    submit.textContent = "Aprobar y crear perfil";
    submit.disabled = allowedSections.length === 0;
    form.append(nieLabel, sectionLabel, submit);
    return form;
}

// Crea una tarjeta de solicitud con sus datos, documentos y acciones de revisión.
function createApplicationCard(application, sections) {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const details = document.createElement("dl");
    const documents = document.createElement("div");
    const actions = document.createElement("div");
    const rejectButton = document.createElement("button");
    const result = document.createElement("p");

    card.className = "admin-card";
    card.dataset.applicationId = String(application.id);
    title.textContent = `Solicitud #${application.id}: ${application.nombre_est} ${application.apellido_est}`;
    details.className = "application-grid";

    [
        ["Fecha de nacimiento", application.fecha_nac_est],
        ["Correo institucional", application.correo_est],
        ["Teléfono del alumno", application.telefono_est],
        ["Dirección", application.direccion_est],
        ["Bachillerato", application.tipo_bachillerato],
        ["Especialidad", application.id_especialidad
            ? (sections.find((section) => Number(section.id_especialidad) === Number(application.id_especialidad))?.especialidad || `ID ${application.id_especialidad}`)
            : "No aplica"],
        ["Encargado", `${application.nombre_rep} ${application.apellido_rep || ""}`.trim()],
        ["DUI del encargado", application.dui_rep],
        ["Teléfono del encargado", application.telefono_rep],
        ["Recibida", application.fecha_registro]
    ].forEach(([label, value]) => addDetail(details, label, value));

    documents.className = "document-links";
    [
        ["partida", "Ver partida de nacimiento"],
        ["notas", "Ver notas anteriores"],
        ["conducta", "Ver carta de conducta"]
    ].forEach(([documentType, label]) => {
        const link = document.createElement("a");
        link.href = `api/admin_document.php?id=${application.id}&documento=${documentType}`;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = label;
        documents.append(link);
    });

    actions.className = "review-actions";
    rejectButton.className = "reject-button";
    rejectButton.type = "button";
    rejectButton.dataset.action = "rechazar";
    rejectButton.textContent = "Rechazar";
    actions.append(rejectButton);
    result.className = "review-result";
    result.setAttribute("role", "status");

    card.append(title, details, documents, createApprovalForm(application, sections), actions, result);
    return card;
}

// Rellena las secciones de docentes, grupos y solicitudes pendientes.
function renderAdminData(data) {
    applicationsList.replaceChildren();
    teachersList.replaceChildren();
    guardiansList.replaceChildren();
    sectionsList.replaceChildren();

    if (data.applications.length === 0) {
        const empty = document.createElement("p");
        empty.className = "admin-empty";
        empty.textContent = "No hay solicitudes pendientes de revisión.";
        applicationsList.append(empty);
    } else {
        data.applications.forEach((application) => {
            applicationsList.append(createApplicationCard(application, data.sections));
        });
    }

    if (data.teachers.length === 0) {
        const empty = document.createElement("p");
        empty.className = "admin-empty";
        empty.textContent = "No hay docentes registrados en la base de datos.";
        teachersList.append(empty);
    } else {
        data.teachers.forEach((teacher) => {
            const card = document.createElement("article");
            const title = document.createElement("h3");
            const details = document.createElement("dl");
            card.className = "admin-card";
            title.textContent = `${teacher.nombre} ${teacher.apellido}`;
            details.className = "application-grid";
            [
                ["DUI", teacher.dui],
                ["Correo", teacher.correo],
                ["Teléfono", teacher.telefono],
                ["Estado", teacher.estado],
                ["Secciones asignadas", teacher.secciones]
            ].forEach(([label, value]) => addDetail(details, label, value));
            card.append(title, details);
            teachersList.append(card);
        });
    }

    if (data.guardians.length === 0) {
        const empty = document.createElement("p");
        empty.className = "admin-empty";
        empty.textContent = "No hay encargados registrados. Sus perfiles se crean al aprobar una matrícula.";
        guardiansList.append(empty);
    } else {
        data.guardians.forEach((guardian) => {
            const card = document.createElement("article");
            const title = document.createElement("h3");
            const details = document.createElement("dl");
            const actions = document.createElement("div");
            const resetButton = document.createElement("button");
            const status = document.createElement("p");

            card.className = "admin-card";
            card.dataset.guardianDui = guardian.dui;
            title.textContent = `${guardian.nombre} ${guardian.apellido}`;
            details.className = "application-grid";
            addDetail(details, "DUI", guardian.dui);
            addDetail(details, "Teléfono", guardian.telefono);
            addDetail(details, "Alumnos vinculados", guardian.alumnos);

            actions.className = "review-actions";
            resetButton.className = "guardian-reset-button";
            resetButton.type = "button";
            resetButton.dataset.action = "restablecer-pin-encargado";
            resetButton.textContent = "Generar PIN temporal nuevo";
            actions.append(resetButton);

            status.className = "review-result";
            status.setAttribute("role", "status");
            card.append(title, details, actions, status);
            guardiansList.append(card);
        });
    }

    if (data.sections.length === 0) {
        const empty = document.createElement("p");
        empty.className = "admin-empty";
        empty.textContent = "No hay secciones registradas. Agrégalas en la base de datos para poder aprobar matrículas.";
        sectionsList.append(empty);
    } else {
        data.sections.forEach((section) => {
            const card = document.createElement("article");
            const title = document.createElement("h3");
            const details = document.createElement("dl");
            const guideForm = document.createElement("form");
            const guideLabel = document.createElement("label");
            const guideSelect = document.createElement("select");
            const guideSubmit = document.createElement("button");
            const guideStatus = document.createElement("p");
            card.className = "admin-card";
            card.dataset.sectionId = String(section.id);
            title.textContent = section.nombre;
            details.className = "application-grid";
            addDetail(details, "Especialidad", section.especialidad);

            guideForm.className = "guide-assignment-form";
            guideForm.dataset.sectionId = String(section.id);
            guideSelect.name = "dui_docente";
            const noGuideOption = new Option("Sin docente guía", "");
            guideSelect.append(noGuideOption);
            data.teachers.forEach((teacher) => {
                const option = new Option(
                    `${teacher.nombre} ${teacher.apellido}${teacher.estado === "ACTIVO" ? "" : " (SUSPENDIDO)"}`,
                    teacher.dui
                );
                if (teacher.estado !== "ACTIVO" && teacher.dui !== section.guia_dui) {
                    option.disabled = true;
                }
                guideSelect.append(option);
            });
            guideSelect.value = section.guia_dui || "";
            guideLabel.append("Docente guía", guideSelect);
            guideSubmit.type = "submit";
            guideSubmit.textContent = "Guardar asignación";
            guideStatus.className = "review-result guide-assignment-status";
            guideStatus.setAttribute("role", "status");
            guideForm.append(guideLabel, guideSubmit, guideStatus);
            addDetail(details, "Guía actual", section.guia_nombre);
            card.append(title, details, guideForm);
            sectionsList.append(card);
        });
    }
}

// Carga los datos del panel, API que solo entrega información a administradores.
async function loadAdminData() {
    adminStatus.className = "admin-status";
    adminStatus.textContent = "Cargando información...";

    try {
        const response = await fetch("api/admin_data.php", {
            headers: { Accept: "application/json" }
        });
        const data = await response.json();
        if (response.status === 401) {
            window.location.replace("index.html");
            return;
        }
        if (!response.ok) {
            throw new Error(data.error || "No se pudieron cargar los datos.");
        }

        renderAdminData(data);
        adminStatus.textContent = `${data.applications.length} solicitud(es) pendiente(s).`;
    } catch (error) {
        adminStatus.classList.add("error");
        adminStatus.textContent = error.message || "No se pudo conectar con el servidor.";
    }
}

// Envía una decisión de revisión y, al aprobar, solicita el NIE y una sección.
async function reviewApplication(applicationId, action, form = null) {
    const card = applicationsList.querySelector(`[data-application-id="${CSS.escape(applicationId)}"]`);
    const result = card.querySelector(".review-result");
    const payload = { id: Number(applicationId), action };

    if (action === "aprobar") {
        payload.nie = form.elements.namedItem("nie").value.trim();
        payload.seccion_id = Number(form.elements.namedItem("seccion_id").value);
    } else if (!window.confirm("¿Seguro que quieres rechazar esta solicitud?")) {
        return;
    }

    const buttons = card.querySelectorAll("button");
    buttons.forEach((button) => {
        button.disabled = true;
    });
    result.textContent = action === "aprobar" ? "Creando el perfil..." : "Rechazando la solicitud...";

    try {
        const response = await fetch("api/admin_review.php", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "No se pudo revisar la solicitud.");
        }

        if (action === "aprobar") {
            const guardianCredential = data.guardian.cuenta_existente
                ? "El encargado ya tenía una cuenta; se conservó su PIN anterior."
                : `PIN temporal del encargado (DUI ${data.guardian.dui}): ${data.guardian.pin_temporal}`;
            adminStatus.textContent = `${data.message} Alumno (${data.student.correo}): PIN temporal ${data.student.pin_temporal}. ${guardianCredential} Anota los PIN ahora; solo se muestran una vez.`;
        } else {
            adminStatus.textContent = data.message;
        }
        card.remove();
        const remaining = applicationsList.querySelectorAll("[data-application-id]").length;
        adminStatus.textContent += ` Quedan ${remaining} solicitud(es) pendiente(s).`;
    } catch (error) {
        result.textContent = error.message || "No se pudo conectar con el servidor.";
        buttons.forEach((button) => {
            button.disabled = false;
        });
    }
}

// La aprobación usa submit; el rechazo usa un botón y confirmación explícita.
applicationsList.addEventListener("submit", (event) => {
    const form = event.target.closest(".approval-form");
    if (!form) {
        return;
    }
    event.preventDefault();
    reviewApplication(form.dataset.applicationId, "aprobar", form);
});

applicationsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='rechazar']");
    if (button) {
        reviewApplication(button.closest("[data-application-id]").dataset.applicationId, "rechazar");
    }
});

guardiansList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action='restablecer-pin-encargado']");
    if (!button) {
        return;
    }

    const card = button.closest("[data-guardian-dui]");
    const status = card.querySelector(".review-result");
    const dui = card.dataset.guardianDui;
    if (!window.confirm(`¿Generar un PIN nuevo para el encargado con DUI ${dui}? El PIN actual dejará de funcionar.`)) {
        return;
    }

    button.disabled = true;
    status.textContent = "Generando PIN temporal...";
    try {
        const response = await fetch("api/admin_guardian_reset_pin.php", {
            method: "POST",
            body: JSON.stringify({ dui }),
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "No se pudo generar el PIN temporal.");
        }
        status.textContent = `${data.message} Entrégaselo al encargado: PIN temporal ${data.pin_temporal}. Anótalo ahora; no volverá a mostrarse.`;
    } catch (error) {
        status.textContent = error.message || "No se pudo conectar con el servidor.";
        button.disabled = false;
    }
});

sectionsList.addEventListener("submit", async (event) => {
    const form = event.target.closest(".guide-assignment-form");
    if (!form) {
        return;
    }
    event.preventDefault();

    const button = form.querySelector("button[type='submit']");
    const status = form.querySelector(".guide-assignment-status");
    const payload = {
        seccion_id: Number(form.dataset.sectionId),
        dui_docente: form.elements.namedItem("dui_docente").value || null
    };
    button.disabled = true;
    status.className = "review-result guide-assignment-status";
    status.textContent = "Guardando asignación...";

    try {
        const response = await fetch("api/admin_section_guide.php", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "No se pudo guardar la asignación.");
        }

        status.classList.add("success");
        status.textContent = data.message;
        const card = form.closest(".admin-card");
        const guideValue = card.querySelector(".application-grid div:last-child dd");
        const selectedOption = form.elements.namedItem("dui_docente").selectedOptions[0];
        guideValue.textContent = payload.dui_docente ? selectedOption.textContent.replace(" (SUSPENDIDO)", "") : "No disponible";
    } catch (error) {
        status.classList.add("error");
        status.textContent = error.message || "No se pudo conectar con el servidor.";
    } finally {
        button.disabled = false;
    }
});

// Crea un perfil docente y muestra su PIN temporal una sola vez.
teacherForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = teacherForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    teacherCreateStatus.className = "teacher-create-status";
    teacherCreateStatus.textContent = "Creando el perfil docente...";

    try {
        const response = await fetch("api/admin_teacher_create.php", {
            method: "POST",
            body: new FormData(teacherForm),
            headers: {
                Accept: "application/json",
                "X-CSRF-Token": csrfToken
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "No se pudo crear el perfil docente.");
        }

        teacherCreateStatus.classList.add("success");
        teacherCreateStatus.textContent = `${data.message} El docente inicia sesión con ${data.teacher.correo} y este PIN temporal: ${data.teacher.pin_temporal}. Anótalo ahora; solo se muestra una vez. Las asignaciones de secciones y materias se harán después.`;
        teacherForm.reset();
        await loadAdminData();
    } catch (error) {
        teacherCreateStatus.classList.add("error");
        teacherCreateStatus.textContent = error.message || "No se pudo conectar con el servidor.";
    } finally {
        submitButton.disabled = false;
    }
});

// Navega entre las tres secciones del panel administrativo.
navigationButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
});

// Cierra la sesión en el servidor antes de volver al inicio de sesión.
logoutButton.addEventListener("click", async () => {
    try {
        await fetch("api/admin_session.php", {
            method: "POST",
            body: new URLSearchParams({ action: "logout" }),
            headers: {
                Accept: "application/json",
                "X-CSRF-Token": csrfToken
            }
        });
    } finally {
        window.location.replace("index.html");
    }
});

// Verifica el acceso y obtiene el token usado para las acciones administrativas.
async function initializeAdminPanel() {
    try {
        const response = await fetch("api/admin_session.php", {
            headers: { Accept: "application/json" }
        });
        const session = await response.json();
        if (!response.ok || !session.authenticated) {
            window.location.replace("index.html");
            return;
        }
        csrfToken = session.csrfToken;
        await loadAdminData();
    } catch (error) {
        adminStatus.classList.add("error");
        adminStatus.textContent = error.message || "No se pudo comprobar la sesión.";
    }
}

initializeAdminPanel();
