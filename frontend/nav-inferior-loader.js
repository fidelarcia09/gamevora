(function () {
    "use strict";

    var path = (window.location.pathname || "").toLowerCase();
    var excludedPages = [
        "/login.html",
        "/recuperar-contrasena.html",
        "/registro.html",
        "/nueva-contrasena.html"
    ];

    if (excludedPages.some(function (page) { return path.endsWith(page); })) {
        return;
    }

    if (window.__ggBottomNavLoaderStarted || document.querySelector(".gg-bottom-nav")) {
        return;
    }

    window.__ggBottomNavLoaderStarted = true;

    var base = /\/frontend\//i.test(window.location.pathname) ? "./" : "frontend/";

    fetch(base + "nav-inferior.html?v=20261101-nav", { cache: "no-cache" })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("No se pudo cargar nav-inferior.html");
            }
            return response.text();
        })
        .then(function (html) {
            var documento = new DOMParser().parseFromString(html, "text/html");

            documento.querySelectorAll("style").forEach(function (estilo) {
                document.head.appendChild(estilo.cloneNode(true));
            });

            documento.querySelectorAll("script").forEach(function (original) {
                var codigo = original.textContent || "";

                // La navegación no debe activar ni duplicar Goldi en páginas que no lo usan.
                if (codigo.indexOf("gg-goldi-loader") !== -1) {
                    return;
                }

                var nuevo = document.createElement("script");
                if (original.src) {
                    nuevo.src = original.src;
                } else {
                    nuevo.textContent = codigo;
                }
                nuevo.async = false;
                document.body.appendChild(nuevo);
            });
        })
        .catch(function (error) {
            console.error("Error al cargar la navegación inferior:", error);
        });
})();