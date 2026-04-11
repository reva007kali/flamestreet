import { PropsWithChildren, useEffect, useMemo, useRef } from "react";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useAuthStore } from "../store/authStore";
import { addToInbox } from "../lib/notificationInbox";
import { createEcho } from "../lib/realtime";
import { useOrderQueueStore } from "../store/orderQueueStore";

const EMPTY_ROLES: readonly string[] = [];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
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

  useEffect(() => {
    let cancelled = false;
    async function initPush() {
      if (!token) return;
      if ((Constants as any).executionEnvironment === "storeClient") return;
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
        settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
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

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const expoPushToken = (
        await Notifications.getExpoPushTokenAsync({ projectId } as any)
      ).data;
      if (!expoPushToken) {
        console.warn("push: empty expo push token");
        return;
      }
      if (cancelled) return;

      const { api } = await import("../lib/api");
      try {
        await api.put("/me/push-token", {
          expo_push_token: expoPushToken,
          platform: Platform.OS,
        });
      } catch (e: any) {
        console.warn("push: failed to save token", e?.response?.status, e?.message);
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
      },
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
