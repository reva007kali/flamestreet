import { Link, Outlet, useLocation } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useNotifStore } from '@/store/notifStore'
import SidePanel from '@/components/common/SidePanel'
import { Bell, ShoppingCart, ChevronRight } from 'lucide-react'
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
    <div className="flex min-h-screen bg-[#09090b] text-zinc-100">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-65 max-h-screen sticky top-0 shrink-0 border-r border-zinc-800/40 bg-zinc-900 lg:flex lg:flex-col">
        <div className="flex h-16 items-center px-6">
          <Link to={brandTo} className="flex items-center gap-2">
            <div className="h-7 w-7">
               <img src="/logo-sm.png" alt="" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white uppercase">{brand}</span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col gap-8 px-4 py-6">
          <nav className="space-y-1">
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Menu</div>
            {navItems.map(({ to, label, Icon }) => {
              const isActive = activeKey === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/10' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-current' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Desktop Profile Quick Link */}
        <div className="mt-auto border-t border-zinc-800/40 p-4">
           <button 
             onClick={async () => {
                setNotifOpen(true)
                await requestDeviceNotificationPermission()
              }}
             className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-zinc-900 transition-colors"
           >
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-zinc-800">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs font-bold text-zinc-400">
                    {(user?.full_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                {unreadCount > 0 && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-[var(--accent)]" />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="truncate text-[13px] font-semibold text-zinc-100">{user?.full_name ?? 'User'}</div>
                <div className="truncate text-[11px] text-zinc-500">Notifications & Info</div>
              </div>
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* MOBILE HEADER */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-zinc-800/40 bg-zinc-950/80 px-4 backdrop-blur-xl lg:hidden">
          <Link to={brandTo} className="flex items-center gap-3 active:scale-95 transition-transform">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-zinc-800 shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-xs font-black text-zinc-400">
                  {(user?.full_name ?? 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-white uppercase">{brand}</div>
              <div className="truncate text-[11px] font-medium text-zinc-500">@{user?.username ?? 'user'}</div>
            </div>
          </Link>
          
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300 active:bg-zinc-800 transition-colors"
              onClick={async () => {
                setNotifOpen(true)
                await requestDeviceNotificationPermission()
              }}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-bounce items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--accent-foreground)] shadow-lg shadow-[var(--accent)]/40">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <Link
              to={cartTo}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300 active:bg-zinc-800 transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black shadow-lg">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+7rem)] lg:px-10 lg:py-8 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/40 bg-zinc-950/90 backdrop-blur-2xl lg:hidden">
          <div className="grid grid-cols-5 gap-1 px-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
            {navItems.slice(0, 5).map(({ to, label, Icon }) => {
                const isActive = activeKey === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl py-1 transition-all duration-300 ${
                      isActive ? 'text-[var(--accent)]' : 'text-zinc-500 active:text-zinc-300'
                    }`}
                  >
                    <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? 'scale-110' : ''}`}>
                       <Icon className={`h-5 w-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]' : ''}`} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight leading-none ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                      {label}
                    </span>
                    {isActive && (
                       <div className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(var(--accent-rgb),0.8)]" />
                    )}
                  </Link>
                )
              })}
          </div>
        </nav>

        {/* NOTIFICATIONS PANEL */}
        <SidePanel open={notifOpen} title="Activity" onClose={() => setNotifOpen(false)}>
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">{unreadCount} New Alerts</div>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--accent)] hover:brightness-125 transition-all"
              onClick={() => markAllRead()}
            >
              Clear All
            </button>
          </div>
          
          <div className="mt-4 space-y-3 overflow-y-auto pr-1">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                  n.read
                    ? 'border-zinc-800/50 bg-zinc-900/30 text-zinc-400'
                    : 'border-[var(--accent)]/30 bg-[var(--accent)]/[0.03] text-zinc-100 ring-1 ring-[var(--accent)]/10'
                }`}
                onClick={() => markRead(n.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold leading-snug group-hover:text-[var(--accent)] transition-colors">
                      {n.title ?? 'System Update'}
                    </div>
                    {n.message && <div className="mt-1 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">{n.message}</div>}
                    <div className="mt-2 text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                      {fmtNotifTime(n.createdAt)}
                    </div>
                  </div>
                  {!n.read && <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" />}
                </div>
              </button>
            ))}
            
            {!notifications.length && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                   <Bell className="h-6 w-6 text-zinc-700" />
                </div>
                <div className="text-sm font-bold text-zinc-100">All caught up!</div>
                <div className="text-xs text-zinc-500 mt-1">No new notifications at this time.</div>
              </div>
            )}
          </div>
        </SidePanel>
      </div>
    </div>
  )
}