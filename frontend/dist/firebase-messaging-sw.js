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

messaging.onBackgroundMessage((payload) => {
  const d = payload?.data ?? {};
  const tag =
    d?.type && (d?.order_id || d?.order_number)
      ? `${d.type}:${d.order_id ?? d.order_number}`
      : d?.type
        ? String(d.type)
        : undefined;
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo-sm.png",
    tag,
    renotify: false,
  });
});
