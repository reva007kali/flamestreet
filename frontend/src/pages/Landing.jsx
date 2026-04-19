import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { api } from "@/lib/axios";
import { toPublicUrl } from "@/lib/assets";
import { useAuthStore } from "@/store/authStore";
import { homeForRoles } from "@/lib/roleHome";
import {
  ArrowRight,
  Flame,
  MapPin,
  Menu as MenuIcon,
  ShoppingCart,
} from "lucide-react";

function pickNutrition(n) {
  const o = n ?? {};
  const kcal =
    o.energy_kcal ?? o.kcal ?? o.calories ?? o.calories_kcal ?? o.energy ?? null;
  const protein = o.protein_g ?? o.protein ?? null;
  const carbs = o.carbs_g ?? o.carb_g ?? o.carbs ?? null;
  const fat = o.fat_g ?? o.fat ?? null;
  return { kcal, protein, carbs, fat };
}

function short(s, max = 88) {
  const v = String(s ?? "").trim();
  if (!v) return "";
  if (v.length <= max) return v;
  return v.slice(0, max - 1).trimEnd() + "…";
}

export default function Landing() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const appHome = useMemo(() => {
    if (token && user) return homeForRoles(user?.roles ?? []);
    return "/login";
  }, [token, user]);

  const dataQuery = useQuery({
    queryKey: ["landing"],
    queryFn: async () => (await api.get("/landing")).data,
    staleTime: 60_000,
  });

  const products = dataQuery.data?.products ?? [];
  const gyms = dataQuery.data?.gyms ?? [];
  const coverage = dataQuery.data?.coverage ?? [];

  const heroProducts = useMemo(() => products.slice(0, 6), [products]);
  const gymCards = useMemo(() => gyms.slice(0, 8), [gyms]);
  const topCoverage = useMemo(() => coverage.slice(0, 10), [coverage]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent)]">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-black italic tracking-tight">
                Flame<span className="text-[var(--accent)]">Street</span>
              </div>
              <div className="-mt-0.5 text-[11px] font-semibold text-white/50">
                Real Protein. Anti Basa-Basi.
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <a
              href="#menu"
              className="rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
            >
              Menu
            </a>
            <a
              href="#coverage"
              className="rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
            >
              Coverage
            </a>
            <a
              href="#how"
              className="rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
            >
              How it works
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {token && user ? (
              <Link
                to={appHome}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-black text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
              >
                Open App <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10 md:inline-flex"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-black text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
                >
                  Join <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(9,221,97,0.10),transparent_55%)]" />
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/60">
                Fresh prep • Macro-first
              </div>
              <h1 className="mt-5 text-4xl font-black italic leading-[0.95] tracking-tighter md:text-6xl">
                Real Protein,
                <br />
                <span className="text-white/40">Anti Basa-Basi.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-white/60">
                Order cepat, tracking jelas, dan coverage gym makin luas. Cocok
                untuk cutting, bulking, atau maintaining.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={appHome}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
                >
                  <ShoppingCart className="h-4 w-4" /> Order Now
                </Link>
                <a
                  href="#menu"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10"
                >
                  <MenuIcon className="h-4 w-4" /> Browse Menu
                </a>
              </div>
              <div className="mt-10 flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-white/40">
                <div>
                  {String(dataQuery.data?.stats?.products ?? products.length)}{" "}
                  products
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div>
                  {String(dataQuery.data?.stats?.gyms ?? gyms.length)} gym points
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {heroProducts.map((p) => {
                  const img = toPublicUrl(p.image);
                  const nutrition = pickNutrition(p.nutritional_info);
                  return (
                    <Link
                      key={p.id}
                      to={token && user ? `/member/product/${p.slug}` : "/login"}
                      className={[
                        "group relative overflow-hidden rounded-[28px] border bg-white/5 p-5 transition",
                        p.is_featured
                          ? "border-[var(--accent)]/25 hover:border-[var(--accent)]/50"
                          : "border-white/10 hover:border-white/20",
                      ].join(" ")}
                    >
                      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-3xl" />
                      </div>
                      <div className="relative">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-black tracking-tight text-white">
                              {p.name}
                            </div>
                            <div className="truncate text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                              {p.category?.name ?? "Meal"}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs font-black text-[var(--accent)]">
                              Rp{" "}
                              {Number(p.price ?? 0).toLocaleString("id-ID")}
                            </div>
                            {nutrition.kcal != null ? (
                              <div className="text-[10px] font-bold text-white/40">
                                {String(nutrition.kcal)} kcal
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-4 overflow-hidden rounded-2xl bg-zinc-900">
                          {img ? (
                            <img
                              alt=""
                              src={img}
                              className="h-36 w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="h-36 w-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
                          )}
                        </div>
                        {nutrition.protein != null ||
                        nutrition.carbs != null ||
                        nutrition.fat != null ? (
                          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-zinc-950/60 p-3 text-center">
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-white/35">
                                Protein
                              </div>
                              <div className="text-sm font-black text-white">
                                {nutrition.protein != null
                                  ? `${String(nutrition.protein)}g`
                                  : "-"}
                              </div>
                            </div>
                            <div className="border-x border-white/10">
                              <div className="text-[9px] font-black uppercase tracking-widest text-white/35">
                                Carbs
                              </div>
                              <div className="text-sm font-black text-white">
                                {nutrition.carbs != null
                                  ? `${String(nutrition.carbs)}g`
                                  : "-"}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-white/35">
                                Fat
                              </div>
                              <div className="text-sm font-black text-white">
                                {nutrition.fat != null
                                  ? `${String(nutrition.fat)}g`
                                  : "-"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 text-xs font-semibold text-white/40">
                            {short(p.description)}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {dataQuery.isLoading ? (
                <div className="mt-4 text-xs font-semibold text-white/40">
                  Loading menu…
                </div>
              ) : null}
              {dataQuery.isError ? (
                <div className="mt-4 text-xs font-semibold text-rose-300">
                  Gagal memuat data landing.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section id="menu" className="mx-auto max-w-7xl px-4 pb-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">
                Featured Menu
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
                Weekly Popular
              </div>
            </div>
            <Link
              to={token && user ? "/member/menu" : "/login"}
              className="text-xs font-black text-[var(--accent)]"
            >
              View all
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 9).map((p) => {
              const img = toPublicUrl(p.image);
              return (
                <Link
                  key={p.id}
                  to={token && user ? `/member/product/${p.slug}` : "/login"}
                  className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 transition hover:border-[var(--accent)]/35 hover:bg-white/[0.07]"
                >
                  <div className="relative h-56 overflow-hidden bg-zinc-900">
                    {img ? (
                      <img
                        alt=""
                        src={img}
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    {p.is_featured ? (
                      <div className="absolute left-5 top-5 rounded-full border border-[var(--accent)]/40 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--accent)] backdrop-blur">
                        Featured
                      </div>
                    ) : null}
                    <div className="absolute right-5 top-5 rounded-2xl border border-white/15 bg-black/50 px-3 py-2 text-right backdrop-blur">
                      <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40">
                        Price
                      </div>
                      <div className="text-sm font-black text-white">
                        Rp {Number(p.price ?? 0).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--accent)]">
                      {p.category?.name ?? "Meal"}
                    </div>
                    <div className="mt-1 text-xl font-black tracking-tight text-white">
                      {p.name}
                    </div>
                    <div className="mt-2 text-sm font-medium leading-relaxed text-white/50">
                      {short(p.description, 110)}
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/60">
                      Open detail <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section
          id="coverage"
          className="border-t border-white/5 bg-black/20"
        >
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/60">
                  Coverage
                </div>
                <div className="mt-4 text-3xl font-black tracking-tight text-white">
                  Gym Coverage
                </div>
                <p className="mt-4 text-sm font-medium leading-relaxed text-white/60">
                  Kami bekerja sama dengan gym untuk pickup point dan area
                  delivery yang makin luas.
                </p>

                <div className="mt-8 grid gap-3">
                  {topCoverage.map((c) => (
                    <div
                      key={`${c.city}-${c.province ?? ""}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-white">
                          {c.city || "Unknown"}
                        </div>
                        <div className="truncate text-[11px] font-semibold text-white/45">
                          {c.province ?? ""}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-[11px] font-black text-[var(--accent)]">
                        {Number(c.count ?? 0)} gyms
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {gymCards.map((g) => {
                  const img = toPublicUrl(g.image);
                  const letter = (g.gym_name?.[0] ?? "G").toUpperCase();
                  return (
                    <div
                      key={g.id}
                      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-zinc-900">
                          {img ? (
                            <img
                              alt=""
                              src={img}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-black text-[var(--accent)]">
                              {letter}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-white">
                            {g.gym_name}
                          </div>
                          <div className="mt-0.5 text-[11px] font-semibold text-white/45">
                            {g.city}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-start gap-2 text-[12px] font-medium text-white/55">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                        <div className="line-clamp-3">{g.address}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-7xl px-4 py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                t: "Pick menu",
                d: "Pilih menu berdasarkan target macro dan budget.",
              },
              {
                t: "Checkout",
                d: "Masukkan alamat, pilih metode pembayaran, dan submit order.",
              },
              {
                t: "Track order",
                d: "Status order real-time sampai delivered.",
              },
            ].map((x) => (
              <div
                key={x.t}
                className="rounded-[28px] border border-white/10 bg-white/5 p-7"
              >
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/45">
                  Step
                </div>
                <div className="mt-2 text-xl font-black tracking-tight text-white">
                  {x.t}
                </div>
                <div className="mt-3 text-sm font-medium leading-relaxed text-white/60">
                  {x.d}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-white/35">
              Ready?
            </div>
            <Link
              to={appHome}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-black text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
            >
              Start Ordering <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-black/20">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-semibold text-white/50">
            © {new Date().getFullYear()} Flamestreet
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/40">
            <a
              href="#menu"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
            >
              Menu
            </a>
            <a
              href="#coverage"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
            >
              Coverage
            </a>
            <a
              href="#how"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
            >
              How it works
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

