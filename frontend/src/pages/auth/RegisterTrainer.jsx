import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { homeForRoles } from "@/lib/roleHome";
import AuthShell from "@/components/auth/AuthShell";
import { Calendar } from "lucide-react";

function onboardingKey(userId) {
  return `flamestreet_onboarding_seen_${userId}`;
}

function normalizeSpaces(s) {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function normalizeUsername(s) {
  return String(s ?? "").trim();
}

function normalizePhone(s) {
  return String(s ?? "")
    .replace(/[^\d+]/g, "")
    .slice(0, 20);
}

function safeErrorMessage(e, fallback) {
  const raw =
    e?.response?.data?.message ??
    e?.message ??
    (typeof e === "string" ? e : null) ??
    fallback;
  const msg = String(raw ?? fallback).trim();
  if (!msg) return fallback;
  return msg.length > 240 ? msg.slice(0, 239) + "…" : msg;
}

export default function RegisterTrainer() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const registerKey = String(search.get("key") ?? "").trim();

  const role = "trainer";
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [error, setError] = useState(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const payload = useMemo(() => {
    const base = {
      full_name: normalizeSpaces(fullName),
      username: normalizeUsername(username),
      phone_number: normalizePhone(phoneNumber),
      email: normalizeEmail(email),
      password: String(password ?? ""),
      role,
      trainer_register_key: registerKey,
      date_of_birth: String(dateOfBirth ?? "").trim(),
    };

    if (instagramHandle.trim())
      base.instagram_handle = String(instagramHandle).trim().slice(0, 100);
    return base;
  }, [
    fullName,
    username,
    phoneNumber,
    email,
    password,
    role,
    registerKey,
    dateOfBirth,
    instagramHandle,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!registerKey) throw new Error("Link trainer tidak valid.");
      if (!payload.full_name) throw new Error("Full name wajib diisi.");
      if (!payload.username) throw new Error("Username wajib diisi.");
      if (!payload.phone_number) throw new Error("Phone number wajib diisi.");
      if (!payload.email) throw new Error("Email wajib diisi.");
      if (!payload.password || payload.password.length < 8)
        throw new Error("Password minimal 8 karakter.");
      if (!payload.date_of_birth) throw new Error("Date of birth wajib diisi.");
      const res = await api.post("/auth/register", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setSession(data.token, data.user);
      const roles = data?.user?.roles ?? [];
      const isMember = roles.includes("member");
      const userId = Number(data?.user?.id ?? 0);
      if (isMember && userId) {
        try {
          const seen = localStorage.getItem(onboardingKey(userId));
          if (!seen) {
            navigate("/member/onboarding", { replace: true });
            return;
          }
        } catch {}
      }
      navigate(homeForRoles(roles), { replace: true });
    },
    onError: (e) => {
      setError(safeErrorMessage(e, "Register failed"));
    },
  });

  if (token && user) {
    return <Navigate to={homeForRoles(user.roles ?? [])} replace />;
  }

  return (
    <AuthShell
      title="Trainer Registration"
      subtitle="Link ini khusus untuk trainer."
    >
      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {!registerKey ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 text-sm text-amber-200">
            Link trainer tidak valid.
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">
                Full Name
              </label>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">
                Username
              </label>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="trainername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">
                Email Address
              </label>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="email"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">
                Phone Number
              </label>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="0812..."
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                maxLength={30}
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                maxLength={128}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">
                  Date of Birth
                </label>
                <div className="relative">
                  <input
                    type="date"
                    id="trainer_register_dob"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 pr-11 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    value={dateOfBirth}
                    max={today}
                    min="1900-01-01"
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                    onClick={() => {
                      const el = document.getElementById(
                        "trainer_register_dob",
                      );
                      if (el instanceof HTMLInputElement) {
                        el.showPicker?.();
                        el.focus();
                      }
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">
                  Instagram (Opt)
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="@username"
                  value={instagramHandle}
                  autoCapitalize="none"
                  autoCorrect="off"
                  maxLength={100}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="group relative w-full overflow-hidden rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          disabled={mutation.isPending || !registerKey}
        >
          <span className={mutation.isPending ? "opacity-0" : "opacity-100"}>
            Create Trainer Account
          </span>
          {mutation.isPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-foreground)] border-t-transparent" />
            </div>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-zinc-500">
        Back to{" "}
        <Link to="/login" className="text-[var(--accent)] hover:underline">
          login
        </Link>
      </div>
    </AuthShell>
  );
}
