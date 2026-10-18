const loginForm = document.querySelector("#admin-login-form");
const loginStatus = document.querySelector("#login-status");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Estado inicial de carga
        loginStatus.className = "login-status";
        loginStatus.textContent = "Verificando credenciales...";

        // Empaquetar los datos ingresados
        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            // Enviar petición al servidor backend en Node.js
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                loginStatus.className = "login-status success";
                loginStatus.textContent = result.mensaje;

                // Guardar datos de sesión del usuario en el navegador
                if (result.usuario) {
                    localStorage.setItem("usuarioSesion", JSON.stringify(result.usuario));
                }

                // Redirigir a su panel correspondiente tras 1 segundo
                setTimeout(() => {
                    window.location.href = result.redirectUrl;
                }, 1000);
            } else {
                loginStatus.className = "login-status error";
                loginStatus.textContent = result.error;
            }
        } catch (error) {
            console.error("Error al conectar:", error);
            loginStatus.className = "login-status error";
            loginStatus.textContent = "Error al conectar con el servidor backend. Asegúrate de encender Node.js.";
        }
    });
}