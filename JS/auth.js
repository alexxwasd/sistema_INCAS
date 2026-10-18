// JS/auth.js - Protección de sesión y roles

// Función para verificar si existe una sesión válida y si tiene el rol correcto
function verificarSesion(rolRequerido) {
    const sesion = localStorage.getItem("usuarioSesion");

    // 1. Si no hay datos guardados, enviar al inicio de sesión
    if (!sesion) {
        window.location.href = "index.html";
        return;
    }

    const usuario = JSON.parse(sesion);

    // 2. Si se especifica un rol y no coincide, denegar acceso
    if (rolRequerido && usuario.rol.toLowerCase() !== rolRequerido.toLowerCase()) {
        alert("No tienes permisos para acceder a esta área.");
        window.location.href = "index.html";
        return;
    }

    // 3. Mostrar el nombre/correo del usuario si existe un elemento con id "usuario-login"
    document.addEventListener("DOMContentLoaded", () => {
        const spanUsuario = document.querySelector("#usuario-login");
        if (spanUsuario) {
            spanUsuario.textContent = usuario.identificador;
        }
    });
}

// Función para cerrar sesión
function cerrarSesion() {
    localStorage.removeItem("usuarioSesion");
    window.location.href = "index.html";
}