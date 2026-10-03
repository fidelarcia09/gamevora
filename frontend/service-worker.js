self.addEventListener("push", function (event) {

    let data = {
        title: "Gamevora",
        body: "Tienes una nueva notificación.",
        icon: "/gamevora/frontend/icon-192.png"
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (error) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || "/gamevora/frontend/icon-192.png",
        badge: data.badge || "/gamevora/frontend/icon-192.png",
        data: {
            url: data.url || "/gamevora/frontend/admin-ventas.html"
        },
        vibrate: [200, 100, 200],
        requireInteraction: true
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || "Gamevora",
            options
        )
    );
});


self.addEventListener("notificationclick", function (event) {

    event.notification.close();

    const url =
        event.notification.data?.url ||
        "/gamevora/frontend/admin-ventas.html";

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(function (clientList) {

            for (const client of clientList) {
                if ("focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
