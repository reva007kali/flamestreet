import * as SecureStore from "expo-secure-store";

export type InboxItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, any> | null;
  createdAt: number;
  read?: boolean;
};

const KEY = "flamestreet_notifications_inbox";
const MAX = 60;

export async function loadInbox(): Promise<InboxItem[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveInbox(items: InboxItem[]) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {}
}

export async function addToInbox(item: Omit<InboxItem, "createdAt"> & { createdAt?: number }) {
  const current = await loadInbox();
  const createdAt = item.createdAt ?? Date.now();
  const next: InboxItem[] = [
    { ...item, createdAt, read: item.read ?? false },
    ...current.filter((i) => i.id !== item.id),
  ];
  await saveInbox(next);
}

export async function markRead(id: string) {
  const current = await loadInbox();
  const next = current.map((i) => (i.id === id ? { ...i, read: true } : i));
  await saveInbox(next);
}

export async function clearInbox() {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {}
}

