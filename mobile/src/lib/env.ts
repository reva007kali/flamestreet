export function getApiBaseUrl(): string {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  return base.replace(/\/+$/, "");
}

export function getApiUrl(): string {
  return `${getApiBaseUrl()}/api`;
}
