const STORAGE_KEY = "flamestreet_device_id";

function genDeviceId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && String(existing).trim()) return String(existing).trim();
  } catch {}

  const id = genDeviceId();
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
  return id;
}

export function clearDeviceId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
