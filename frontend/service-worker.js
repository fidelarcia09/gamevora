self.addEventListener("push", function (event) {

    // =========================================================
    // GAMERS GOLD TOP-UP
    // LOGO OFICIAL DE LAS NOTIFICACIONES
    // =========================================================

    const LOGO =
        "/frontend/imagenes/file_000000004c9c81f58dd5cfed4a31afe4.png";


    let data = {
        title: "Nueva Venta Gamers Gold",
        body: "Tienes una nueva notificación.",
        url: "/frontend/admin-ventas.html"
    };


    // =========================================================
    // DATOS RECIBIDOS DEL SERVIDOR
    // =========================================================

    if (event.data) {

        try {

            const receivedData = event.data.json();

            data = {
                ...data,
                ...receivedData
            };

        } catch (error) {

            data.body = event.data.text();

        }

    }


    // =========================================================
    // CONFIGURACIÓN DE LA NOTIFICACIÓN
    // =========================================================

    const options = {

        body: data.body,

        // SIEMPRE NUESTRO LOGO
        icon: LOGO,

        // SIEMPRE NUESTRO LOGO
        badge: LOGO,

        data: {
            url: data.url || "/frontend/admin-ventas.html"
        },

        vibrate: [200, 100, 200],

        requireInteraction: true

    };


    // =========================================================
    // MOSTRAR NOTIFICACIÓN
    // =========================================================

    event.waitUntil(

        self.registration.showNotification(

            data.title || "Nueva Venta Gamers Gold",

            options

        )

    );

});



/* =========================================================
   CLICK EN LA NOTIFICACIÓN
   ========================================================= */

self.addEventListener("notificationclick", function (event) {

    event.notification.close();


    const url =
        event.notification.data?.url ||
        "/frontend/admin-ventas.html";


    event.waitUntil(

        clients.matchAll({

            type: "window",

            includeUncontrolled: true

        })

        .then(function (clientList) {


            // =================================================
            // SI LA PÁGINA YA ESTÁ ABIERTA
            // =================================================

            for (const client of clientList) {

                if ("focus" in client) {

                    client.navigate(url);

                    return client.focus();

                }

            }


            // =================================================
            // SI NO ESTÁ ABIERTA
            // =================================================

            if (clients.openWindow) {

                return clients.openWindow(url);

            }

        })

    );

});

🔥 Qué cambia

Ahora todas las notificaciones tendrán como "icon" y "badge":

"frontend/imagenes/file_000000004c9c81f58dd5cfed4a31afe4.png"

Y eliminamos las rutas antiguas:

"/gamevora/frontend/icon-192.png"

También cambié los textos predeterminados de Gamevora → Gamers Gold Top-Up.

Importante: después de subir el nuevo "service-worker.js" a GitHub, Chrome puede conservar temporalmente el Service Worker anterior. Si al probarlo todavía aparece el icono viejo, no significa que el código esté mal; primero hay que dejar que Chrome actualice el Service Worker.

Y una cosa: Chrome/Android seguirá siendo quien dibuje la notificación, así que elementos propios de Chrome/Android no se pueden sustituir. Lo que sí estamos cambiando es el icono de nuestra notificación.
