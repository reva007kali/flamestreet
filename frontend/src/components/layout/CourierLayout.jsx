import { Link, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

export default function CourierLayout() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/courier" className="font-semibold">
            Flamestreet Courier
          </Link>
          <nav className="flex items-center gap-4 text-sm text-zinc-300">
            <Link to="/courier/dashboard" className="hover:text-white">
              Deliveries
            </Link>
            <Button variant="secondary" size="sm" onClick={() => logout()} type="button">
              Logout
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
