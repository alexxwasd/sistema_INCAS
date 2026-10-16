// Formulario para crear la primera cuenta de administrador con un PIN elegido.
const setupForm = document.querySelector("#admin-setup-form");
const setupStatus = document.querySelector("#admin-setup-status");

// Si ya se creó un administrador, evita mostrar el formulario de configuración inicial.
async function checkSetupAvailability() {
    try {
        const response = await fetch("api/admin_session.php", {
            headers: { Accept: "application/json" }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "No se pudo comprobar el estado de la configuración.");
        }
        if (!result.setupRequired) {
            window.location.replace("index.html");
        }
    } catch (error) {
        setupStatus.classList.add("error");
        setupStatus.textContent = error.message || "No se pudo conectar con el servidor.";
        setupForm.querySelector("button[type='submit']").disabled = true;
    }
}

// Envía los datos de la cuenta inicial una sola vez al servidor.
setupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pin = setupForm.elements.namedItem("pin").value;
    const confirmation = setupForm.elements.namedItem("confirmar_pin").value;

    if (pin !== confirmation) {
        setupStatus.className = "login-status error";
        setupStatus.textContent = "Los PIN no coinciden.";
        return;
    }

    const button = setupForm.querySelector("button[type='submit']");
    button.disabled = true;
    setupStatus.className = "login-status";
    setupStatus.textContent = "Creando la cuenta...";

    try {
        const response = await fetch("api/admin_setup.php", {
            method: "POST",
            body: new FormData(setupForm),
            headers: { Accept: "application/json" }
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "No se pudo crear la cuenta.");
        }

        setupStatus.className = "login-status success";
        setupStatus.textContent = "Administrador creado. Abriendo el inicio de sesión...";
        window.setTimeout(() => window.location.assign("index.html"), 1000);
    } catch (error) {
        setupStatus.className = "login-status error";
        setupStatus.textContent = error.message || "No se pudo conectar con el servidor.";
        button.disabled = false;
    }
});

checkSetupAvailability();
