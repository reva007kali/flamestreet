import { getApiBaseUrl } from "./env";

export function toPublicUrl(path?: string | null): string | null {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const base = getApiBaseUrl();
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return `${base}${normalized}`;
}

