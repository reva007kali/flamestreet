import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { homeForRoles } from "@/lib/roleHome";
import AuthShell from "@/components/auth/AuthShell";
import { Calendar } from "lucide-react";

const REF_KEY = "flamestreet_ref";

export default function Register() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const ref = search.get("ref");
    if (ref) {
      localStorage.setItem(REF_KEY, ref);
    }
    const stored = localStorage.getItem(REF_KEY) ?? "";
    if (stored) setReferralCode(stored);
  }, [search]);

  const payload = useMemo(() => {
    const base = {
      full_name: fullName,
      username,
      phone_number: phoneNumber,
      email,
      password,
      role,
    };

    if (dateOfBirth) base.date_of_birth = dateOfBirth;
    if (role === "member" && referralCode) base.referral_code = referralCode;
    return base;
  }, [
    fullName,
    username,
    phoneNumber,
    email,
    password,
    role,
    dateOfBirth,
    referralCode,
  ]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/register", payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (role === "member") localStorage.removeItem(REF_KEY);
      setSession(data.token, data.user);
      navigate(homeForRoles(data.user.roles), { replace: true });
    },
    onError: (e) => {
      setError(e?.response?.data?.message ?? "Register failed");
    },
  });

  return (
    <AuthShell
      title="Create Account"
      subtitle="Daftar sekarang dan mulailah perjalanan latihanmu di Flamestreet."
    >
      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        {/* Role Selector - Segmented Control Style */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            I am a...
          </label>
          <div className="flex gap-2 rounded-lg bg-zinc-950 p-1 border border-zinc-800">
            {["member", "trainer"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                  role === r
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-4">
          {/* Group 1: Identity */}
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
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">
                Username
              </label>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Group 2: Contact */}
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
              />
            </div>
          </div>

          {/* Group 3: Security & Misc */}
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
                    id="register_dob"
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
                      const el = document.getElementById("register_dob");
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
              {role === "member" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">
                    Referral (Opt)
                  </label>
                  <input
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-zinc-100 outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    placeholder="CODE123"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
                </div>
              )}
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
          disabled={mutation.isPending}
        >
          <span className={mutation.isPending ? "opacity-0" : "opacity-100"}>
            Create Account
          </span>
          {mutation.isPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-foreground)] border-t-transparent" />
            </div>
          )}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          className="font-semibold text-[var(--accent)] hover:underline"
          to="/login"
        >
          Sign in
        </Link>
      </div>
    </AuthShell>
  );
}
