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
const MAX_STORE_CHARS = 1900;
const MAX_TITLE_CHARS = 80;
const MAX_BODY_CHARS = 200;

function clampText(v: any, max: number): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v);
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function sanitizeItem(i: InboxItem): InboxItem {
  return {
    ...i,
    title: clampText(i.title, MAX_TITLE_CHARS) ?? "Notification",
    body: clampText(i.body, MAX_BODY_CHARS),
    data: i.data ?? null,
  };
}

function shrinkForStorage(items: InboxItem[]): InboxItem[] {
  let next = items.map(sanitizeItem).slice(0, MAX);
  let raw = JSON.stringify(next);
  if (raw.length <= MAX_STORE_CHARS) return next;

  next = next.map((i) => ({ ...i, data: null }));
  raw = JSON.stringify(next);
  while (next.length > 0 && raw.length > MAX_STORE_CHARS) {
    next = next.slice(0, -1);
    raw = JSON.stringify(next);
  }
  return next;
}

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
    const safe = shrinkForStorage(items);
    await SecureStore.setItemAsync(KEY, JSON.stringify(safe));
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
