export function supportsDeviceNotifications() {
  return typeof window !== 'undefined' && typeof window.Notification !== 'undefined'
}

export async function requestDeviceNotificationPermission() {
  if (!supportsDeviceNotifications()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function canShowDeviceNotification() {
  if (!supportsDeviceNotifications()) return false
  if (Notification.permission !== 'granted') return false
  return typeof document !== 'undefined' && document.visibilityState !== 'visible'
}

export function showDeviceNotification({ title, body }) {
  if (!canShowDeviceNotification()) return null
  try {
    const n = new Notification(title || 'Notification', {
      body: body || '',
      silent: true,
    })
    n.onclick = () => {
      try {
        window.focus()
      } catch {}
      try {
        n.close()
      } catch {}
    }
    return n
  } catch {
    return null
  }
}

