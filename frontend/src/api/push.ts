import api from "./client";

let swRegistration: ServiceWorkerRegistration | null = null;

export async function getVapidKey(): Promise<string> {
  const res = await api.get<{ public_key: string }>("/notifications/push/vapid-key");
  return res.data.public_key;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications not supported");
    return false;
  }

  try {
    const vapidKey = await getVapidKey();
    if (!vapidKey) return false;

    swRegistration = await navigator.serviceWorker.register("/sw-push.js");
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });

    const json = subscription.toJSON();
    await api.post("/notifications/push/subscribe", {
      endpoint: json.endpoint,
      keys: json.keys,
    });

    return true;
  } catch (err) {
    console.error("Push registration failed:", err);
    return false;
  }
}

export async function unregisterPush(): Promise<void> {
  if (!swRegistration) {
    swRegistration = await navigator.serviceWorker.getRegistration("/sw-push.js") ?? null;
  }
  if (!swRegistration) return;

  const subscription = await swRegistration.pushManager.getSubscription();
  if (subscription) {
    const json = subscription.toJSON();
    try {
      await api.delete("/notifications/push/subscribe", {
        data: { endpoint: json.endpoint, keys: json.keys },
      });
    } catch { /* ignore */ }
    await subscription.unsubscribe();
  }
}
