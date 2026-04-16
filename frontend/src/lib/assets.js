export function getPublicBaseUrl() {
  const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
  return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
}

export function toPublicUrl(path) {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  const base = getPublicBaseUrl();
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${base}${normalized}`;
}
