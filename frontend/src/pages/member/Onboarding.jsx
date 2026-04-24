import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { homeForRoles } from "@/lib/roleHome";

function keyFor(userId) {
  return `flamestreet_onboarding_seen_${userId}`;
}

export default function MemberOnboarding() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(0);

  const slides = useMemo(
    () => [
      {
        title: "Welcome to Flame Street",
        text: "Order protein meal, pantau status, dan kumpulin Flame Points.",
      },
      {
        title: "Pilih varian dulu",
        text: "Kalau produk punya variant/modifier, wajib dipilih sebelum add to cart.",
      },
      {
        title: "Notifikasi & chat",
        text: "Status order dan chat courier masuk ke Activity (notif) dan push notification.",
      },
    ],
    [],
  );

  const roles = user?.roles ?? [];
  const userId = Number(user?.id ?? 0);
  const isMember = roles.includes("member");

  useEffect(() => {
    if (!user) return;
    if (!isMember) {
      navigate(homeForRoles(roles), { replace: true });
      return;
    }
    if (userId) {
      const seen = localStorage.getItem(keyFor(userId));
      if (seen) navigate("/member", { replace: true });
    }
  }, [user?.id, isMember, roles.join(","), navigate]);

  const s = slides[step] ?? slides[0];

  const finish = () => {
    if (userId) {
      try {
        localStorage.setItem(keyFor(userId), "1");
      } catch {}
    }
    navigate("/member", { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-between px-4 py-6">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={finish}
            className="text-xs font-black uppercase tracking-[0.2em] text-white/50 hover:text-white/80 transition-all"
          >
            Skip
          </button>
        </div>

        <div className="space-y-5 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl border border-white/10 bg-white/5 backdrop-blur grid place-items-center">
            <img src="/flame-icon.png" alt="" className="h-10 w-10" />
          </div>
          <div className="text-2xl font-black uppercase tracking-tight">
            {s.title}
          </div>
          <div className="text-sm font-semibold text-white/50">{s.text}</div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={[
                  "h-1.5 rounded-full transition-all",
                  i === step ? "w-6 bg-[var(--accent)]" : "w-1.5 bg-white/15",
                ].join(" ")}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((v) => Math.max(0, v - 1))}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs font-black uppercase tracking-[0.2em] text-white disabled:opacity-30"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (step === slides.length - 1) finish();
                else setStep((v) => Math.min(slides.length - 1, v + 1));
              }}
              className="flex-1 rounded-2xl bg-[var(--accent)] py-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)]"
            >
              {step === slides.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
