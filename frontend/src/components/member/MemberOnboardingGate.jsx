import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

function keyFor(userId) {
  return `flamestreet_onboarding_seen_${userId}`;
}

export default function MemberOnboardingGate() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const roles = user?.roles ?? [];
  const isMember = roles.includes("member");
  const userId = Number(user?.id ?? 0);

  if (!isMember || !userId) return <Outlet />;

  try {
    const seen = localStorage.getItem(keyFor(userId));
    if (!seen && location.pathname !== "/member/onboarding") {
      return <Navigate to="/member/onboarding" replace />;
    }
  } catch {}

  return <Outlet />;
}
