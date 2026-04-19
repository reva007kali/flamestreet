importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyDK-KoH0Z_r-N-3ULINVFzGKcpKt1-UXMM",
  authDomain: "mobile-bc775.firebaseapp.com",
  projectId: "mobile-bc775",
  storageBucket: "mobile-bc775.firebasestorage.app",
  messagingSenderId: "792974816063",
  appId: "1:792974816063:web:d219a4e83910c63b7a998a",
});

const messaging = firebase.messaging();

function resolveUrlFromData(d) {
  const origin = self.location?.origin ?? "";
  const raw = d?.url ? String(d.url) : "";
  if (raw) {
    try {
      const u = new URL(raw, origin);
      if (u.origin === origin) return u.href;
      return origin;
    } catch {
      return origin;
    }
  }

  const t = d?.type ? String(d.type) : "";
  const orderNumber = d?.order_number ? String(d.order_number) : "";
  if (orderNumber) {
    if (t === "delivery_assigned") {
      return new URL(`/courier/delivery/${encodeURIComponent(orderNumber)}`, origin).href;
    }
    return new URL(`/orders/${encodeURIComponent(orderNumber)}`, origin).href;
  }

  const postId = d?.post_id != null ? Number(d.post_id) : null;
  if (t.startsWith("flamehub") && postId != null && Number.isFinite(postId)) {
    return new URL(`/member/flamehub/p/${postId}`, origin).href;
  }

  return origin;
}

messaging.onBackgroundMessage((payload) => {
  if (payload?.notification?.title) {
    return;
  }
  const d = payload?.data ?? {};
  const tag =
    d?.type && (d?.order_id || d?.order_number)
      ? `${d.type}:${d.order_id ?? d.order_number}`
      : d?.type
        ? String(d.type)
        : undefined;
  const title =
    (d?.title && String(d.title)) ||
    (d?.notification_title && String(d.notification_title)) ||
    "Notification";
  const body =
    (d?.body && String(d.body)) ||
    (d?.message && String(d.message)) ||
    (d?.order_number ? `#${String(d.order_number)}` : "");
  const url = resolveUrlFromData(d);
  self.registration.showNotification(title, {
    body,
    icon: "/logo-sm.png",
    tag,
    renotify: false,
    data: { url, ...d },
  });
});

self.addEventListener("notificationclick", (event) => {
  try {
    event.notification.close();
  } catch {}

  const url =
    (event?.notification?.data?.url && String(event.notification.data.url)) ||
    (self.location?.origin ?? "/");

  event.waitUntil(
    (async () => {
      const target = (() => {
        try {
          const u = new URL(url, self.location.origin);
          if (u.origin !== self.location.origin) return self.location.origin;
          return u.href;
        } catch {
          return self.location.origin;
        }
      })();

      const list = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const c of list) {
        try {
          const cu = new URL(c.url);
          if (cu.origin !== self.location.origin) continue;
          await c.focus();
          c.postMessage({ type: "navigate", url: target });
          return;
        } catch {}
      }

      await clients.openWindow(target);
    })(),
  );
});
