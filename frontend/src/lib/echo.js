import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

export function createEcho(token) {
  if (!token) return null

  window.Pusher = Pusher

  const apiUrl = import.meta.env.VITE_API_URL
  const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  const base = new URL(baseUrl)
  const scheme = import.meta.env.VITE_PUSHER_SCHEME ?? base.protocol.replace(':', '') ?? 'http'
  const host = import.meta.env.VITE_PUSHER_HOST ?? base.hostname ?? window.location.hostname
  const port = Number(import.meta.env.VITE_PUSHER_PORT ?? (scheme === 'https' ? 443 : 6001))
  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1'

  return new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authEndpoint: `${baseUrl}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}
