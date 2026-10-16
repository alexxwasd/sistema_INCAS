// Elementos de autenticación de las cuentas y enlace al registro inicial de administrador.
const loginForm = document.querySelector("#admin-login-form");
const loginStatus = document.querySelector("#login-status");
const setupLink = document.querySelector("#admin-setup-link");
const roleSelect = document.querySelector("#login-role");
const identifierInput = document.querySelector("#username");
const identifierLabel = document.querySelector("#login-identifier-label");

const roleLoginFields = {
    administrador: { label: "Correo del administrador", type: "email", placeholder: "Ingrese su correo" },
    alumno: { label: "Correo institucional del alumno", type: "email", placeholder: "alumno@instituto.edu.sv" },
    encargado: { label: "DUI del encargado", type: "text", placeholder: "00000000-0" },
    docente: { label: "Correo del docente", type: "email", placeholder: "Ingrese su correo" }
};

// Cambia el tipo de identificador según la cuenta que intenta iniciar sesión.
function updateLoginIdentifier() {
    const fields = roleLoginFields[roleSelect.value];
    identifierLabel.textContent = fields.label;
    identifierInput.type = fields.type;
    identifierInput.placeholder = fields.placeholder;
    identifierInput.inputMode = roleSelect.value === "encargado" ? "numeric" : "email";
}

// Consulta si ya existe un administrador y si hay una sesión activa.
async function checkAdminSession() {
    try {
        const response = await fetch("api/admin_session.php", {
            headers: { Accept: "application/json" }
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "No se pudo comprobar la sesión.");
        }

        setupLink.hidden = !result.setupRequired;
        if (result.authenticated) {
            window.location.replace(result.redirect);
        }
    } catch (error) {
        loginStatus.classList.add("error");
        loginStatus.textContent = error.message || "No se pudo conectar con el servidor.";
    }
}

// Envía el rol, su identificador y PIN; PHP verifica la cuenta y crea la sesión.
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginStatus.className = "login-status";
    loginStatus.textContent = "Verificando acceso...";

    try {
        const response = await fetch("api/admin_session.php", {
            method: "POST",
            body: new FormData(loginForm),
            headers: { Accept: "application/json" }
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "No se pudo iniciar sesión.");
        }

        loginStatus.classList.add("success");
        loginStatus.textContent = "Acceso correcto. Abriendo el panel...";
        window.location.assign(result.redirect);
    } catch (error) {
        loginStatus.classList.add("error");
        loginStatus.textContent = error.message || "No se pudo conectar con el servidor.";
    }
});

roleSelect.addEventListener("change", updateLoginIdentifier);
updateLoginIdentifier();
checkAdminSession();