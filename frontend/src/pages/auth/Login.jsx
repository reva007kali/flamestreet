import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { homeForRoles } from "@/lib/roleHome";
import AuthShell from "@/components/auth/AuthShell";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const fromPath = (() => {
    const p = location?.state?.from;
    if (typeof p !== "string") return null;
    if (!p.startsWith("/")) return null;
    if (p === "/login" || p === "/register") return null;
    return p;
  })();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/login", { login, password });
      return res.data;
    },
    onSuccess: (data) => {
      setSession(data.token, data.user);
      navigate(fromPath ?? homeForRoles(data.user.roles), { replace: true });
    },
    onError: (e) => {
      setError(e?.response?.data?.message ?? "Login failed");
    },
  });

  if (token && user) {
    return <Navigate to={fromPath ?? homeForRoles(user.roles)} replace />;
  }

  return (
    <AuthShell title="Welcome Back" subtitle="Login to continue to Flamestreet">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {/* Email */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Email or Username</label>
          <input
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-white outline-none transition-all 
        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
        placeholder:text-zinc-500"
            placeholder="you@example.com"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-white outline-none transition-all 
        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
        placeholder:text-zinc-500"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Button */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="relative w-full overflow-hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition-all
      bg-emerald-400 hover:bg-emerald-300
      shadow-[0_0_20px_rgba(16,185,129,0.35)]
      hover:shadow-[0_0_30px_rgba(16,185,129,0.55)]
      disabled:opacity-50"
        >
          <span className="relative z-10">
            {mutation.isPending ? "Signing in..." : "Login"}
          </span>

          {/* subtle glow layer */}
          <span
            className="absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100 
        bg-gradient-to-r from-emerald-400/20 via-transparent to-emerald-400/20"
          />
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
        <div className="h-px flex-1 bg-zinc-800" />
        OR
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Register */}
      <div className="text-center text-sm text-zinc-400">
        No account?{" "}
        <Link
          to="/register"
          className="font-medium text-emerald-400 transition hover:text-emerald-300 hover:underline"
        >
          Create one
        </Link>
      </div>
    </AuthShell>
  );
}
