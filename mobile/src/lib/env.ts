export function getApiBaseUrl(): string {
  const base =
    process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.flamestreet.id";
  return base.replace(/\/+$/, "");
}

export function getApiUrl(): string {
  return `${getApiBaseUrl()}/api`;
}
