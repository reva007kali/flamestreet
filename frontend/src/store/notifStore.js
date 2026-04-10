import { create } from 'zustand'

export const useNotifStore = create((set, get) => ({
  notifications: [],
  push: (notif) =>
    set({
      notifications: [
        { id: crypto.randomUUID(), read: false, createdAt: Date.now(), ...notif },
        ...get().notifications,
      ],
    }),
  markRead: (id) =>
    set({
      notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }),
  markAllRead: () =>
    set({
      notifications: get().notifications.map((n) => ({ ...n, read: true })),
    }),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
