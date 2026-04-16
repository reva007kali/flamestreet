import FlameLogo from "@/components/brand/FlameLogo";

const BG_URL =
  "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=2400&q=80";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_URL})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/80 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.22),transparent_55%)]" />

      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-14">
        <div className="w-full max-w-md">
          <div className="mx-auto flex flex-col items-center text-center">
            <div className="grid place-items-center rounded-2xl border border-emerald-400/35 bg-black/35 p-3 shadow-[0_0_55px_rgba(34,197,94,0.22)] backdrop-blur">
              <FlameLogo className="h-10 w-10 drop-shadow-[0_0_18px_rgba(34,197,94,0.45)]" />
            </div>
            <h1 className="mt-5 text-2xl font-black tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-zinc-300/85">{subtitle}</p>
            ) : null}
          </div>

          <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-zinc-950/65 p-6 shadow-[0_0_60px_rgba(34,197,94,0.18)] ring-1 ring-emerald-400/15 backdrop-blur">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
