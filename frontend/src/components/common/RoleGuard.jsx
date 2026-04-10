import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

function homeForRoles(roles) {
  if (roles.includes('admin')) return '/admin'
  if (roles.includes('trainer')) return '/trainer'
  if (roles.includes('courier')) return '/courier'
  if (roles.includes('member')) return '/member'
  return '/login'
}

export default function RoleGuard({ allowRoles }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!allowRoles?.length) return <Outlet />

  const roles = user.roles ?? []
  const ok = allowRoles.some((r) => roles.includes(r))
  if (!ok) {
    return <Navigate to={homeForRoles(roles)} replace />
  }

  return <Outlet />
}

