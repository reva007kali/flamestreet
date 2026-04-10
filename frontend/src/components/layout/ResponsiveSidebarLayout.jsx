import { Link, Outlet, useLocation } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useNotifStore } from '@/store/notifStore'
import SidePanel from '@/components/common/SidePanel'
import { Bell, ShoppingCart } from 'lucide-react'
import { requestDeviceNotificationPermission } from '@/lib/deviceNotifications'

export default function ResponsiveSidebarLayout({ brand, brandTo, basePath, navItems }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const cartItems = useCartStore((s) => s.items)
  const notifications = useNotifStore((s) => s.notifications)
  const unreadCount = useNotifStore((s) => s.unreadCount)()
  const markRead = useNotifStore((s) => s.markRead)
  const markAllRead = useNotifStore((s) => s.markAllRead)
  const [notifOpen, setNotifOpen] = useState(false)

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  }, [])

  const avatarUrl = useMemo(() => {
    const p = user?.avatar
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    if (p.startsWith('uploads/')) return `${baseUrl}/${p}`
    return `${baseUrl}/storage/${p}`
  }, [baseUrl, user?.avatar])

  const activeKey = useMemo(() => {
    const path = location.pathname
    let best = { key: navItems[0]?.to ?? '', score: -1 }

    for (const item of navItems) {
      const matchPaths = item.matchPaths?.length ? item.matchPaths : [item.to]
      for (const p of matchPaths) {
        if (path === p || path.startsWith(p + '/')) {
          if (p.length > best.score) best = { key: item.to, score: p.length }
        }
      }
    }

    return best.key
  }, [location.pathname, navItems])

  const cartTo = `${basePath}/cart`
  const cartCount = useMemo(
    () => (cartItems ?? []).reduce((sum, it) => sum + (Number(it?.quantity ?? 1) || 1), 0),
    [cartItems],
  )

  function fmtNotifTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-800 text-zinc-100">
      <aside className="hidden w-[240px] shrink-0 border-r border-zinc-800/70 bg-zinc-900 lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b border-zinc-800/70 px-4">
          <Link to={brandTo} className="text-[13.5px] font-semibold tracking-tight text-zinc-100">
            {brand}
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800"
              onClick={async () => {
                setNotifOpen(true)
                await requestDeviceNotificationPermission()
              }}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--accent-foreground)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2 py-3">
          {navItems.map(({ to, label, Icon }) => {
            const isActive = activeKey === to
            return (
              <Link
                key={to}
                to={to}
                className={[
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  isActive ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200',
                ].join(' ')}
              >
                <Icon
                  className={[
                    'h-[15px] w-[15px] shrink-0',
                    isActive ? 'text-[var(--accent)]' : 'text-zinc-500',
                  ].join(' ')}
                />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-zinc-800/60 bg-zinc-950/70 px-4 backdrop-blur lg:hidden">
          <Link to={brandTo} className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-zinc-300">
                  {(user?.full_name ?? 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-100">{brand}</div>
              <div className="truncate text-xs text-zinc-500">{user?.full_name ?? ''}</div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              onClick={async () => {
                setNotifOpen(true)
                await requestDeviceNotificationPermission()
              }}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--accent-foreground)]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>
            <Link
              to={cartTo}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--accent-foreground)]">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+7rem)] lg:px-8 lg:py-7 lg:pb-7">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800/80 bg-zinc-950/95 backdrop-blur lg:hidden">
          <div className="grid grid-cols-5 gap-1 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
            {navItems.slice(0, 5).map(({ to, label, Icon }) => {
                const isActive = activeKey === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={[
                      'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                        : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200',
                    ].join(' ')}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="leading-none">{label}</span>
                  </Link>
                )
              })}
          </div>
        </nav>

        <SidePanel open={notifOpen} title="Notifications" onClose={() => setNotifOpen(false)}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">{unreadCount} unread</div>
            <button
              type="button"
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
              onClick={() => markAllRead()}
            >
              Mark all read
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={[
                  'w-full rounded-xl border p-3 text-left transition-colors',
                  n.read
                    ? 'border-zinc-800 bg-zinc-950 text-zinc-300'
                    : 'border-[var(--accent-border)] bg-[var(--accent-muted)] text-zinc-100',
                ].join(' ')}
                onClick={() => markRead(n.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{n.title ?? 'Notification'}</div>
                    {n.message ? <div className="mt-1 text-xs text-zinc-400">{n.message}</div> : null}
                  </div>
                  <div className="shrink-0 text-[10px] text-zinc-500">{fmtNotifTime(n.createdAt)}</div>
                </div>
              </button>
            ))}
            {!notifications.length ? <div className="text-sm text-zinc-400">No notifications.</div> : null}
          </div>
        </SidePanel>
      </div>
    </div>
  )
}
