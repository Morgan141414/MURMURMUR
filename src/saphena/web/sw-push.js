// Service Worker for Web Push notifications — Bloom OS
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Bloom OS", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/bloom-icon-192.png",
    badge: "/bloom-icon-192.png",
    tag: data.tag || "bloom-os",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title || "Bloom OS", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
