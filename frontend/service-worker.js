/* =========================================================
GAMERS GOLD TOP-UP
SERVICE WORKER
========================================================= */

/* =========================================================
ACTUALIZACIÓN DEL SERVICE WORKER
========================================================= */

self.addEventListener("install", function (event) {

event.waitUntil(
    self.skipWaiting()
);

});

self.addEventListener("activate", function (event) {

event.waitUntil(
    clients.claim()
);

});

/* =========================================================
NOTIFICACIONES PUSH
========================================================= */

self.addEventListener("push", function (event) {

const LOGO =
    "/gamevora/frontend/imagenes/file_000000004c9c81f58dd5cfed4a31afe4.png";

const URL_GVR =
    "https://fidelarcia09.github.io/gamevora/frontend/confirmaciones-gvr.html";

let data = {
    title: "Nueva Venta Gamers Gold",
    body: "Tienes una nueva notificación.",
    url: "/gamevora/frontend/admin-ventas.html"
};


/* =====================================================
   DATOS RECIBIDOS DEL SERVIDOR
   ===================================================== */

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


/* =====================================================
   DETERMINAR EL DESTINO DE LA NOTIFICACIÓN
   ===================================================== */

const esSolicitudGVR =
    data.title === "Nueva solicitud de compra GVR" ||
    data.tag?.startsWith("gvr-purchase-") ||
    data.data?.request_id != null;

const destino = esSolicitudGVR
    ? URL_GVR
    : (data.url || "/gamevora/frontend/admin-ventas.html");


/* =====================================================
   CONFIGURACIÓN DE LA NOTIFICACIÓN
   ===================================================== */

const options = {

    body: typeof data.body === "string" ? data.body.replace(/\s+·\s+/g, "\n") : data.body,

    icon: LOGO,

    badge: LOGO,

    data: {
        ...data.data,
        url: destino
    },

    tag: data.tag,

    vibrate: [200, 100, 200],

    requireInteraction: true

};


/* =====================================================
   MOSTRAR NOTIFICACIÓN
   ===================================================== */

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

const URL_GVR =
    "https://fidelarcia09.github.io/gamevora/frontend/confirmaciones-gvr.html";

const notificationData = event.notification.data || {};

const esSolicitudGVR =
    event.notification.title === "Nueva solicitud de compra GVR" ||
    notificationData.tag?.startsWith("gvr-purchase-") ||
    notificationData.request_id != null;

const destino = esSolicitudGVR
    ? URL_GVR
    : (notificationData.url ||
       "https://fidelarcia09.github.io/gamevora/frontend/admin-ventas.html");


event.waitUntil(

    clients.matchAll({

        type: "window",

        includeUncontrolled: true

    })

    .then(async function (clientList) {

        const destinoURL = new URL(destino);

        for (const client of clientList) {

            if (
                client.url.startsWith(self.location.origin) &&
                "navigate" in client
            ) {

                const clientURL = new URL(client.url);

                if (
                    clientURL.href === destinoURL.href &&
                    "focus" in client
                ) {

                    return client.focus();

                }

            }

        }

        if (clients.openWindow) {

            return clients.openWindow(destinoURL.href);

        }

    })

);

});
