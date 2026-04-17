import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

async function ensureMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active?.scriptURL?.includes("/firebase-messaging-sw.js"))
    return existing;
  const reg = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
  try {
    await navigator.serviceWorker.ready;
  } catch {}
  const ready = await navigator.serviceWorker.getRegistration();
  if (ready?.active?.scriptURL?.includes("/firebase-messaging-sw.js"))
    return ready;
  return reg;
}

export async function requestNotificationPermission() {
  try {
    if (typeof window === "undefined" || typeof Notification === "undefined")
      return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const swReg = await ensureMessagingServiceWorker();
    const vapidKey = String(
      import.meta.env.VITE_FIREBASE_VAPID_KEY ?? "",
    ).trim();
    if (!vapidKey || vapidKey.length < 80) {
      throw new Error(
        "VITE_FIREBASE_VAPID_KEY invalid. Gunakan Web Push certificates key (public key) dari Firebase Console → Project Settings → Cloud Messaging.",
      );
    }
    if (swReg && !swReg.active) {
      throw new Error(
        "Service Worker belum aktif. Refresh halaman lalu coba lagi (HTTPS wajib).",
      );
    }
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg ?? undefined,
    });

    return token;
  } catch (err) {
    console.error("FCM token error:", err);
    return null;
  }
}

export { onMessage };
