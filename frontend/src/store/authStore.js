import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      hasRole: (role) => {
        const roles = get().user?.roles ?? []
        return roles.includes(role)
      },
    }),
    { name: 'flamestreet_auth' },
  ),
)

