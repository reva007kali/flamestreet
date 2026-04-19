import { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import { addToInbox } from "../lib/notificationInbox";
import { createEcho } from "../lib/realtime";
import { useOrderQueueStore } from "../store/orderQueueStore";
import * as SecureStore from "expo-secure-store";
import { navigationRef } from "../navigation/navRef";

const EMPTY_ROLES: readonly string[] = [];
const ANDROID_DEFAULT_CHANNEL_ID = "default";
const EXPO_PUSH_TOKEN_KEY = "flamestreet_expo_push_token";

async function ensureAndroidDefaultChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    showBadge: true,
  });
  const current = await Notifications.getNotificationChannelAsync(
    ANDROID_DEFAULT_CHANNEL_ID,
  );
  console.warn(
    "push: android channel ready",
    current?.id,
    current?.importance,
    current?.sound,
  );
}

ensureAndroidDefaultChannel().catch((e) =>
  console.warn("push: failed to set android channel", e?.message ?? e),
);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function NotificationBridge({ children }: PropsWithChildren) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? EMPTY_ROLES;
  const setCounts = useOrderQueueStore((s) => s.setCounts);

  const echo = useMemo(() => (token ? createEcho(token) : null), [token]);
  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  const openFromData = async (data: any) => {
    const d = data ?? {};
    const type = String(d?.type ?? "");
    const orderIdRaw = d?.order_id ?? d?.orderId ?? null;
    const orderNumberRaw = d?.order_number ?? d?.orderNumber ?? null;
    const orderId = orderIdRaw != null ? Number(orderIdRaw) : null;
    const orderNumber = orderNumberRaw != null ? String(orderNumberRaw) : "";
    const urlRaw = d?.url != null ? String(d.url) : "";
    const postIdRaw = d?.post_id ?? d?.postId ?? d?.id ?? null;
    const postId = postIdRaw != null ? Number(postIdRaw) : null;
    const username = d?.username != null ? String(d.username) : "";

    const go = () => {
      if (!navigationRef.isReady()) return false;

      if (urlRaw && urlRaw.startsWith("/")) {
        const mChat = urlRaw.match(/\/chats\/([^/?#]+)/i);
        const mOrder = urlRaw.match(/\/orders\/([^/?#]+)/i);
        const mDelivery = urlRaw.match(/\/courier\/delivery\/([^/?#]+)/i);
        if (mChat?.[1]) {
          navigationRef.navigate("ChatThread", {
            orderNumber: String(mChat[1]),
            orderId: orderId ?? undefined,
          });
          return true;
        }
        if (mDelivery?.[1]) {
          navigationRef.navigate("OrderDetail", {
            orderNumber: String(mDelivery[1]),
            orderId: orderId ?? undefined,
          });
          return true;
        }
        if (mOrder?.[1]) {
          navigationRef.navigate("OrderDetail", {
            orderNumber: String(mOrder[1]),
            orderId: orderId ?? undefined,
          });
          return true;
        }
      }

      if (type === "order_chat_message" && orderNumber) {
        navigationRef.navigate("ChatThread", {
          orderNumber,
          orderId: orderId ?? undefined,
        });
        return true;
      }

      if (orderNumber) {
        const isAdmin = roles.includes("admin");
        const isCashier = roles.includes("cashier");
        if (isAdmin && orderId != null && Number.isFinite(orderId)) {
          navigationRef.navigate("AdminOrderDetail", { id: orderId });
          return true;
        }
        if (isCashier && orderId != null && Number.isFinite(orderId)) {
          navigationRef.navigate("CashierOrderDetail", { id: orderId });
          return true;
        }

        navigationRef.navigate("OrderDetail", {
          orderNumber,
          orderId: orderId ?? undefined,
        });
        return true;
      }

      if (
        type.startsWith("flamehub") &&
        postId != null &&
        Number.isFinite(postId)
      ) {
        navigationRef.navigate("FlamehubPost", { id: postId });
        return true;
      }
      if (type.startsWith("flamehub") && username) {
        navigationRef.navigate("FlamehubProfile", { username });
        return true;
      }

      return false;
    };

    if (go()) return;
    let tries = 0;
    const tick = () => {
      tries += 1;
      if (go()) return;
      if (tries >= 20) return;
      setTimeout(tick, 200);
    };
    setTimeout(tick, 200);
  };

  useEffect(() => {
    async function ensureAndroidChannel() {
      try {
        await ensureAndroidDefaultChannel();
      } catch (e: any) {
        console.warn("push: failed to set android channel", e?.message ?? e);
      }
    }
    ensureAndroidChannel();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initPush() {
      if (!token) return;
      if ((Constants as any).executionEnvironment === "storeClient") return;
      await ensureAndroidDefaultChannel();
      const projectId =
        (Constants.easConfig as any)?.projectId ??
        (Constants.expoConfig as any)?.extra?.eas?.projectId ??
        (Constants as any)?.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.warn("push: missing EAS projectId (extra.eas.projectId)");
        return;
      }

      const settings = await Notifications.getPermissionsAsync();
      let granted =
        settings.granted ||
        settings.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL;
      if (!granted) {
        const req = await Notifications.requestPermissionsAsync();
        granted =
          req.granted ||
          req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      }
      if (!granted) {
        console.warn("push: permission not granted");
        return;
      }

      const expoPushToken = (
        await Notifications.getExpoPushTokenAsync({ projectId } as any)
      ).data;
      if (!expoPushToken) {
        console.warn("push: empty expo push token");
        return;
      }
      if (cancelled) return;

      try {
        await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_KEY, expoPushToken);
      } catch {}

      const { api } = await import("../lib/api");
      try {
        await api.put("/me/push-token", {
          expo_push_token: expoPushToken,
          platform: Platform.OS,
        });
      } catch (e: any) {
        console.warn(
          "push: failed to save token",
          e?.response?.status,
          e?.message,
        );
      }
    }
    initPush().catch((e) => console.warn("push: init failed", e?.message ?? e));
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (receivedSub.current) receivedSub.current.remove();
    if (responseSub.current) responseSub.current.remove();

    receivedSub.current = Notifications.addNotificationReceivedListener(
      async (n) => {
        const content = n.request.content;
        const id = `${n.request.identifier}`;
        await addToInbox({
          id,
          type: String(content.data?.type ?? "push"),
          title: String(content.title ?? "Notification"),
          body: (content.body as string) ?? null,
          data: (content.data as any) ?? null,
        });
      },
    );

    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      async (r) => {
        const content = r.notification.request.content;
        const id = `${r.notification.request.identifier}`;
        await addToInbox({
          id,
          type: String(content.data?.type ?? "push"),
          title: String(content.title ?? "Notification"),
          body: (content.body as string) ?? null,
          data: (content.data as any) ?? null,
          read: true,
        });
        await openFromData(content.data);
      },
    );

    Notifications.getLastNotificationResponseAsync()
      .then(async (r) => {
        if (!r) return;
        const content = r.notification.request.content;
        const id = `${r.notification.request.identifier}`;
        await addToInbox({
          id,
          type: String(content.data?.type ?? "push"),
          title: String(content.title ?? "Notification"),
          body: (content.body as string) ?? null,
          data: (content.data as any) ?? null,
          read: true,
        });
        await openFromData(content.data);
      })
      .catch((e) =>
        console.warn(
          "push: failed to read last notification response",
          e?.message ?? e,
        ),
      );

    return () => {
      if (receivedSub.current) receivedSub.current.remove();
      if (responseSub.current) responseSub.current.remove();
      receivedSub.current = null;
      responseSub.current = null;
    };
  }, []);

  useEffect(() => {
    if (!echo || !token || !user?.id) return;

    const userChannel = echo.private(`user.${user.id}`);
    userChannel.listen(".UserNotification", async (payload: any) => {
      const id = `user:${user.id}:${payload?.type ?? "event"}:${payload?.data?.order_number ?? payload?.data?.order_id ?? Date.now()}`;
      await addToInbox({
        id,
        type: String(payload?.type ?? "event"),
        title: String(payload?.title ?? "Notification"),
        body: payload?.data?.body ?? null,
        data: payload?.data ?? null,
      });
    });

    let staffChannel: any = null;
    if (roles.includes("admin") || roles.includes("cashier")) {
      staffChannel = echo.private("staff.orders");
      staffChannel.listen(".OrderQueueUpdated", async (payload: any) => {
        if (payload?.counts) setCounts(payload.counts);
        const id = `staff:orders:${payload?.event_type ?? "queue"}:${payload?.order_number ?? Date.now()}`;
        await addToInbox({
          id,
          type: "order_queue",
          title: "Antrian order berubah",
          body: payload?.order_number ? `#${payload.order_number}` : null,
          data: payload ?? null,
        });
      });
    }

    return () => {
      try {
        userChannel.stopListening(".UserNotification");
        echo.leave(`private-user.${user.id}`);
        if (staffChannel) {
          staffChannel.stopListening(".OrderQueueUpdated");
          echo.leave("private-staff.orders");
        }
        echo.disconnect();
      } catch {}
    };
  }, [echo, token, user?.id, roles.join("|")]);

  return <>{children}</>;
}
