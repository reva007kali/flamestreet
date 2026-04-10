import { Link, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useQueueStore } from '@/store/queueStore'

export default function CashierLayout() {
  const logout = useAuthStore((s) => s.logout)
  const counts = useQueueStore((s) => s.counts)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/cashier" className="font-semibold">
            Flamestreet Cashier
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
            <Link to="/cashier/queue" className="hover:text-white">
              Queue
              {counts.queue_unpaid ? (
                <span className="ml-2 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] text-[var(--accent)]">
                  {counts.queue_unpaid}
                </span>
              ) : null}
            </Link>
            <Link to="/cashier/orders" className="hover:text-white">
              Orders
            </Link>
            <button
              type="button"
              className="rounded bg-zinc-800 px-3 py-1 hover:bg-zinc-700"
              onClick={() => logout()}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

