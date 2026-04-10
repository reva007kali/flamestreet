import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createEcho } from '@/lib/echo'
import { useAuthStore } from '@/store/authStore'
import { useNotifStore } from '@/store/notifStore'
import { useQueueStore } from '@/store/queueStore'
import { api } from '@/lib/axios'
import { playNotifySound } from '@/lib/notifySound'
import { showDeviceNotification } from '@/lib/deviceNotifications'

const EchoContext = createContext(null)

function notifMessage(type, data) {
  const d = data ?? {}
  if (type === 'reward_in') {
    const pts = d?.points != null ? `${Number(d.points).toLocaleString('id-ID')} pts` : ''
    const on = d?.order_number ? `Order ${d.order_number}` : ''
    return [pts, on].filter(Boolean).join(' • ')
  }
  if (type === 'order_status') {
    const on = d?.order_number ? `Order ${d.order_number}` : ''
    const st = d?.status ? String(d.status) : ''
    const ps = d?.payment_status ? String(d.payment_status) : ''
    return [on, st, ps].filter(Boolean).join(' • ')
  }
  if (type === 'redeem_requested' || type === 'redeem_approved' || type === 'redeem_rejected' || type === 'point_redeem') {
    const amt = d?.amount != null ? `${Number(d.amount).toLocaleString('id-ID')} pts` : ''
    const id = d?.redeem_request_id ? `#${d.redeem_request_id}` : ''
    const reason = d?.reason ? String(d.reason) : ''
    return [id, amt, reason].filter(Boolean).join(' • ')
  }
  if (typeof d?.message === 'string' && d.message.trim()) return d.message.trim()
  return ''
}

export function RealtimeProvider({ children }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const pushNotif = useNotifStore((s) => s.push)
  const setCounts = useQueueStore((s) => s.setCounts)
  const [echo, setEcho] = useState(null)

  useEffect(() => {
    const instance = createEcho(token)
    setEcho(instance)
    return () => {
      if (instance?.disconnect) instance.disconnect()
    }
  }, [token])

  useEffect(() => {
    const pusher = echo?.connector?.pusher
    const conn = pusher?.connection
    if (!conn) return

    const onError = (e) => {
      const msg =
        e?.error?.data?.message ||
        e?.error?.message ||
        e?.message ||
        'Realtime connection error'
      pushNotif({ type: 'realtime_error', title: 'Realtime issue', message: String(msg) })
    }

    const onDisconnected = () => {
      pushNotif({ type: 'realtime_disconnected', title: 'Realtime disconnected', message: 'Trying to reconnect…' })
    }

    conn.bind('error', onError)
    conn.bind('disconnected', onDisconnected)

    return () => {
      try {
        conn.unbind('error', onError)
        conn.unbind('disconnected', onDisconnected)
      } catch {}
    }
  }, [echo, pushNotif])

  const roles = useMemo(() => user?.roles ?? [], [user])

  useEffect(() => {
    if (!echo || !user) return

    const cleanups = []

    const userChannel = echo.private(`user.${user.id}`)
    userChannel.listen('.UserNotification', (e) => {
      const t = e?.type ?? 'notification'
      const d = e?.data ?? e
      pushNotif({ type: t, title: e?.title ?? 'Notification', message: notifMessage(t, d), data: d })
      showDeviceNotification({
        title: e?.title ?? 'Notification',
        body: notifMessage(t, d) || (typeof t === 'string' ? t : ''),
      })
      if (t === 'reward_in') playNotifySound('success')
      else if (t === 'order_status') playNotifySound('status')
      else playNotifySound('default')
    })
    cleanups.push(() => echo.leave(`user.${user.id}`))

    if (roles.includes('admin') || roles.includes('cashier')) {
      api
        .get('/staff/orders/counts')
        .then((r) => {
          if (r.data?.counts) setCounts(r.data.counts)
        })
        .catch(() => {})

      const channel = echo.private('staff.orders')
      channel.listen('.OrderQueueUpdated', (e) => {
        if (e?.counts) setCounts(e.counts)
        if (e?.event_type === 'created' && e?.order_number) {
          pushNotif({ type: 'order_created', title: `New order ${e.order_number}`, message: e.order_number, data: e })
          showDeviceNotification({ title: 'New order', body: e.order_number })
          playNotifySound('default')
        } else if (e?.event_type === 'payment' && e?.order_number) {
          pushNotif({ type: 'order_paid', title: `Payment confirmed ${e.order_number}`, message: e.order_number, data: e })
          showDeviceNotification({ title: 'Payment confirmed', body: e.order_number })
          playNotifySound('success')
        } else if (e?.event_type === 'status' && e?.order_number && e?.status) {
          pushNotif({ type: 'order_status', title: `Order ${e.order_number}: ${e.status}`, message: `${e.order_number} • ${e.status}`, data: e })
          showDeviceNotification({ title: `Order ${e.order_number}`, body: String(e.status) })
          playNotifySound('status')
        }
      })
      cleanups.push(() => echo.leave('staff.orders'))
    }

    if (roles.includes('trainer')) {
      const channel = echo.private(`trainer.${user.id}`)
      channel.listen('.NewMemberReferred', (e) => {
        pushNotif({ type: 'new_member', title: 'New member referred', message: e?.member?.full_name ?? '', data: e })
        showDeviceNotification({ title: 'New member referred', body: e?.member?.full_name ?? '' })
        playNotifySound('default')
      })
      channel.listen('.PointEarned', (e) => {
        const msg = e?.amount != null ? `${Number(e.amount).toLocaleString('id-ID')} pts` : ''
        pushNotif({ type: 'point_earned', title: 'Point earned', message: msg, data: e })
        showDeviceNotification({ title: 'Point earned', body: `${e?.amount ?? ''}`.trim() })
        playNotifySound('success')
      })
      cleanups.push(() => echo.leave(`trainer.${user.id}`))
    }

    if (roles.includes('courier')) {
      const channel = echo.private(`courier.${user.id}`)
      channel.listen('.NewDeliveryAssigned', (e) => {
        pushNotif({ type: 'delivery_assigned', title: 'New delivery assigned', message: e?.order_number ?? '', data: e })
        showDeviceNotification({ title: 'New delivery assigned', body: e?.order_number ?? '' })
        playNotifySound('default')
      })
      cleanups.push(() => echo.leave(`courier.${user.id}`))
    }

    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [echo, user, roles, pushNotif, setCounts])

  return <EchoContext.Provider value={echo}>{children}</EchoContext.Provider>
}

export function useEcho() {
  return useContext(EchoContext)
}
