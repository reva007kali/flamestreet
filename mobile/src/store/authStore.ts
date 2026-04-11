import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export type Role = "admin" | "cashier" | "member" | "trainer" | "courier";

export type User = {
  id: number;
  full_name?: string | null;
  username?: string | null;
  phone_number?: string | null;
  email?: string | null;
  avatar?: string | null;
  is_active?: boolean;
  roles?: Role[];
  trainer_profile?: {
    total_points?: number | null;
  } | null;
  member_profile?: {
    default_gym_id?: number | null;
    total_points?: number | null;
  } | null;
};

type AuthState = {
  hydrated: boolean;
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: User | null) => void;
  hydrate: () => Promise<void>;
  hasRole: (role: Role) => boolean;
};

const TOKEN_KEY = "flamestreet_token";
const EMPTY_ROLES: Role[] = [];

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  token: null,
  user: null,
  setToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    set({ token });
  },
  setUser: (user) =>
    set({
      user: user ? { ...user, roles: user.roles ?? EMPTY_ROLES } : null,
    }),
  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token, hydrated: true });
  },
  hasRole: (role) => {
    const roles = get().user?.roles ?? EMPTY_ROLES;
    return roles.includes(role);
  },
}));
