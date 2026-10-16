// Comprueba que la cuenta conectada coincida con el rol de este portal.
const requiredRole = document.body.dataset.requiredRole;
const roleDestinations = {
    administrador: "panel_admin.html",
    alumno: "panel_alumno.html",
    encargado: "panel_encargado.html",
    docente: "panel_docente.html"
};

let currentCsrfToken = "";

// Si no hay sesión, vuelve al inicio; si el rol no coincide, abre el portal correcto.
async function verifyPortalSession() {
    try {
        const response = await fetch("api/admin_session.php", {
            headers: { Accept: "application/json" }
        });
        const session = await response.json();
        if (!response.ok || !session.authenticated) {
            window.location.replace("index.html");
            return;
        }
        if (session.role !== requiredRole) {
            window.location.replace(session.redirect || "index.html");
            return;
        }
        currentCsrfToken = session.csrfToken;
    } catch (error) {
        console.error("No se pudo comprobar la sesión del portal:", error);
        window.location.replace("index.html");
    }
}

// Cierra la sesión en el servidor antes de abandonar el portal del usuario.
document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    try {
        await fetch("api/admin_session.php", {
            method: "POST",
            body: new URLSearchParams({ action: "logout" }),
            headers: {
                Accept: "application/json",
                "X-CSRF-Token": currentCsrfToken
            }
        });
    } finally {
        window.location.replace("index.html");
    }
});

verifyPortalSession();
