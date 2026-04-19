import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createEcho } from "@/lib/echo";
import { useAuthStore } from "@/store/authStore";
import { useNotifStore } from "@/store/notifStore";
import { useQueueStore } from "@/store/queueStore";
import { api } from "@/lib/axios";
import { playNotifySound } from "@/lib/notifySound";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import {
  messaging,
  onMessage,
  requestNotificationPermission,
} from "@/lib/firebase";

const EchoContext = createContext(null);

function notifMessage(type, data) {
  const d = data ?? {};
  if (type === "reward_in") {
    const pts =
      d?.points != null
        ? `${Number(d.points).toLocaleString("id-ID")} pts`
        : "";
    const on = d?.order_number ? `Order ${d.order_number}` : "";
    return [pts, on].filter(Boolean).join(" • ");
  }
  if (type === "order_status") {
    if (typeof d?.body === "string" && d.body.trim()) return d.body.trim();
    const on = d?.order_number ? `Order ${d.order_number}` : "";
    const st = d?.status ? String(d.status) : "";
    const ps = d?.payment_status ? String(d.payment_status) : "";
    return [on, st, ps].filter(Boolean).join(" • ");
  }
  if (
    type === "redeem_requested" ||
    type === "redeem_approved" ||
    type === "redeem_rejected" ||
    type === "point_redeem"
  ) {
    const amt =
      d?.amount != null
        ? `${Number(d.amount).toLocaleString("id-ID")} pts`
        : "";
    const id = d?.redeem_request_id ? `#${d.redeem_request_id}` : "";
    const reason = d?.reason ? String(d.reason) : "";
    return [id, amt, reason].filter(Boolean).join(" • ");
  }
  if (type === "order_chat_message") {
    const on = d?.order_number ? `Order ${d.order_number}` : "";
    const body =
      typeof d?.body === "string" && d.body.trim()
        ? d.body.trim()
        : typeof d?.message === "string" && d.message.trim()
          ? d.message.trim()
          : "";
    return [on, body].filter(Boolean).join(" • ");
  }
  if (typeof d?.message === "string" && d.message.trim())
    return d.message.trim();
  return "";
}

export function RealtimeProvider({ children }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const pushNotif = useNotifStore((s) => s.push);
  const setCounts = useQueueStore((s) => s.setCounts);
  const qc = useQueryClient();
  const [echo, setEcho] = useState(null);
  const echoInstanceRef = useRef(null);
  const disconnectTimerRef = useRef(null);

  const pushOnce = ({ notif, sound }) => {
    const inserted = pushNotif(notif);
    if (!inserted) return;
    if (sound) playNotifySound(sound);
    if (notif?.type === "order_chat_message") {
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
    }
  };

  useEffect(() => {
    const instance = createEcho(token);
    if (disconnectTimerRef.current) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    echoInstanceRef.current = instance;
    setEcho(instance);
    return () => {
      if (disconnectTimerRef.current) {
        window.clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      if (echoInstanceRef.current !== instance) return;

      const state = instance?.connector?.pusher?.connection?.state;
      if (import.meta.env.DEV && state === "connecting") {
        disconnectTimerRef.current = window.setTimeout(() => {
          if (echoInstanceRef.current !== instance) return;
          try {
            instance?.disconnect?.();
          } catch {}
        }, 800);
        return;
      }

      try {
        instance?.disconnect?.();
      } catch {}
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    requestNotificationPermission()
      .then((fcmToken) => {
        if (cancelled) return;
        if (!fcmToken) return;
        return api.post("/device-tokens", {
          token: fcmToken,
          platform: "web",
          device_id: getOrCreateDeviceId(),
          user_agent:
            typeof navigator !== "undefined" ? String(navigator.userAgent) : "",
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!token || !user) return;
    return onMessage(messaging, (payload) => {
      const data = payload?.data ?? {};
      const t = data?.type ?? "push";
      const title =
        payload?.notification?.title ?? data?.title ?? "Notification";
      const body = payload?.notification?.body ?? data?.body ?? "";
      const msg = notifMessage(t, { ...data, message: body });
      const sound =
        t === "reward_in"
          ? "success"
          : t === "order_status"
            ? "status"
            : t === "order_chat_message"
              ? "chat"
              : "default";
      pushOnce({
        notif: {
          type: String(t),
          title: String(title),
          message: String(msg),
          data,
        },
        sound,
      });
    });
  }, [token, user?.id, pushNotif]);

  useEffect(() => {
    const pusher = echo?.connector?.pusher;
    const conn = pusher?.connection;
    if (!conn) return;

    const onError = (e) => {
      const msg =
        e?.error?.data?.message ||
        e?.error?.message ||
        e?.message ||
        "Realtime connection error";
      pushNotif({
        type: "realtime_error",
        title: "Realtime issue",
        message: String(msg),
      });
    };

    const onDisconnected = () => {
      pushNotif({
        type: "realtime_disconnected",
        title: "Realtime disconnected",
        message: "Trying to reconnect…",
      });
    };

    conn.bind("error", onError);
    conn.bind("disconnected", onDisconnected);

    return () => {
      try {
        conn.unbind("error", onError);
        conn.unbind("disconnected", onDisconnected);
      } catch {}
    };
  }, [echo, pushNotif]);

  const roles = useMemo(() => user?.roles ?? [], [user]);

  useEffect(() => {
    if (!echo || !user) return;

    const cleanups = [];

    const userChannel = echo.private(`user.${user.id}`);
    userChannel.listen(".UserNotification", (e) => {
      const t = e?.type ?? "notification";
      const d = e?.data ?? e;
      const msg = notifMessage(t, d);
      const sound =
        t === "reward_in"
          ? "success"
          : t === "order_status"
            ? "status"
            : t === "order_chat_message"
              ? "chat"
              : "default";
      pushOnce({
        notif: {
          type: t,
          title: e?.title ?? "Notification",
          message: msg,
          data: d,
        },
        sound,
      });
    });
    cleanups.push(() => echo.leave(`user.${user.id}`));

    if (roles.includes("admin") || roles.includes("cashier")) {
      api
        .get("/staff/orders/counts")
        .then((r) => {
          if (r.data?.counts) setCounts(r.data.counts);
        })
        .catch(() => {});

      const channel = echo.private("staff.orders");
      channel.listen(".OrderQueueUpdated", (e) => {
        if (e?.counts) setCounts(e.counts);
        if (e?.event_type === "created" && e?.order_number) {
          pushOnce({
            notif: {
              type: "order_created",
              title: `New order ${e.order_number}`,
              message: e.order_number,
              data: e,
            },
            sound: "default",
          });
        } else if (e?.event_type === "payment" && e?.order_number) {
          pushOnce({
            notif: {
              type: "order_paid",
              title: `Payment confirmed ${e.order_number}`,
              message: e.order_number,
              data: e,
            },
            sound: "success",
          });
        } else if (e?.event_type === "status" && e?.order_number && e?.status) {
          pushOnce({
            notif: {
              type: "order_status",
              title: `Order ${e.order_number}: ${e.status}`,
              message: `${e.order_number} • ${e.status}`,
              data: e,
            },
            sound: "status",
          });
        }
      });
      cleanups.push(() => echo.leave("staff.orders"));
    }

    if (roles.includes("trainer")) {
      const channel = echo.private(`trainer.${user.id}`);
      channel.listen(".NewMemberReferred", (e) => {
        pushOnce({
          notif: {
            type: "new_member",
            title: "New member referred",
            message: e?.member?.full_name ?? "",
            data: e,
          },
          sound: "default",
        });
      });
      channel.listen(".PointEarned", (e) => {
        const msg =
          e?.amount != null
            ? `${Number(e.amount).toLocaleString("id-ID")} pts`
            : "";
        pushOnce({
          notif: {
            type: "point_earned",
            title: "Point earned",
            message: msg,
            data: e,
          },
          sound: "success",
        });
      });
      cleanups.push(() => echo.leave(`trainer.${user.id}`));
    }

    if (roles.includes("courier")) {
      const channel = echo.private(`courier.${user.id}`);
      channel.listen(".NewDeliveryAssigned", (e) => {
        pushOnce({
          notif: {
            type: "delivery_assigned",
            title: "New delivery assigned",
            message: e?.order_number ?? "",
            data: e,
          },
          sound: "default",
        });
      });
      cleanups.push(() => echo.leave(`courier.${user.id}`));
    }

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [echo, user, roles, pushNotif, setCounts]);

  return <EchoContext.Provider value={echo}>{children}</EchoContext.Provider>;
}

export function useEcho() {
  return useContext(EchoContext);
}
