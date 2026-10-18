const navigationButtons = document.querySelectorAll(".nav-link");
const contentViews = document.querySelectorAll(".content-view");

function showView(viewName) {
    navigationButtons.forEach((button) => {
        const active = button.dataset.view === viewName
            || (viewName === "alumno-detalle" && button.dataset.view === "alumnos");
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

navigationButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-view]:not(.nav-link)").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
        window.location.assign("index.html");
    });
});

document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const status = form.querySelector("[role='status']");
        if (status) {
            status.textContent = "El guardado no está disponible en esta versión de interfaz.";
        }
    });
});
