import { create } from "zustand";

function genId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function dedupeKeyOf(n) {
  const d = n?.data ?? {};
  const parts = [
    n?.type,
    n?.title,
    n?.message,
    d?.order_id,
    d?.order_number,
    d?.chat_message_id,
    d?.sender_id,
    d?.status,
    d?.payment_status,
    d?.event_type,
    d?.redeem_request_id,
    d?.amount,
    d?.points,
  ];
  return parts
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map((v) => String(v))
    .join("|");
}

export const useNotifStore = create((set, get) => ({
  notifications: [],
  push: (notif) => {
    const now = Date.now();
    const key = dedupeKeyOf(notif);
    const recent = get().notifications;
    const isDup = recent.some((n) => {
      if (!n?.createdAt) return false;
      if (now - Number(n.createdAt) > 5000) return false;
      return dedupeKeyOf(n) === key;
    });
    if (isDup) return false;

    set({
      notifications: [
        { id: genId(), read: false, createdAt: now, ...notif },
        ...recent,
      ],
    });
    return true;
  },
  markRead: (id) =>
    set({
      notifications: get().notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }),
  markAllRead: () =>
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
