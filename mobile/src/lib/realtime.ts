import Echo from "laravel-echo";
import Pusher from "pusher-js/react-native";
import { getApiBaseUrl } from "./env";

export function createEcho(token: string) {
  const key = process.env.EXPO_PUBLIC_PUSHER_APP_KEY;
  if (!key) return null;

  const apiBase = getApiBaseUrl();
  const host = process.env.EXPO_PUBLIC_PUSHER_HOST;
  const cluster = process.env.EXPO_PUBLIC_PUSHER_CLUSTER;
  const port = process.env.EXPO_PUBLIC_PUSHER_PORT
    ? Number(process.env.EXPO_PUBLIC_PUSHER_PORT)
    : undefined;
  const forceTLS = process.env.EXPO_PUBLIC_PUSHER_TLS
    ? process.env.EXPO_PUBLIC_PUSHER_TLS === "true"
    : undefined;

  const echo = new Echo({
    broadcaster: "pusher",
    client: Pusher as any,
    key,
    cluster: cluster as any,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS,
    enabledTransports: ["ws", "wss"],
    authEndpoint: `${apiBase.replace(/\/$/, "")}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  });

  return echo;
}
