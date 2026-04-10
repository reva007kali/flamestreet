export function homeForRoles(roles) {
  if (roles?.includes('admin')) return '/admin'
  if (roles?.includes('cashier')) return '/cashier'
  if (roles?.includes('trainer')) return '/trainer'
  if (roles?.includes('courier')) return '/courier'
  return '/member'
}
