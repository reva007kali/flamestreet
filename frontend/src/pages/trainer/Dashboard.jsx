import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import ReferralLink from "@/components/trainer/ReferralLink";
import MemberActivityFeed from "@/components/trainer/MemberActivityFeed";
import PromoCarousel from "@/components/common/PromoCarousel";
import { useAuthStore } from "@/store/authStore";
import { useMemo } from "react";
import ArticleCarousel from "@/components/common/ArticleCarousel";
import {
  Coins,
  FileText,
  LayoutDashboard,
  Users,
  User,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Loader2,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
  }, []);

  const avatarUrl = useMemo(() => {
    const p = user?.avatar;
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return p.startsWith("uploads/")
      ? `${baseUrl}/${p}`
      : `${baseUrl}/storage/${p}`;
  }, [baseUrl, user?.avatar]);

  const query = useQuery({
    queryKey: ["trainer", "dashboard"],
    queryFn: async () => (await api.get("/trainer/dashboard")).data,
  });

  const promoQuery = useQuery({
    queryKey: ["promo-banners", { audience: "trainer" }],
    queryFn: async () =>
      (await api.get("/promo-banners", { params: { audience: "trainer" } }))
        .data.banners,
  });

  const promoSlides = useMemo(() => {
    const banners = promoQuery.data ?? [];
    return banners.map((b) => ({
      kicker: b.kicker ?? "Trainer Info",
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.image
        ? b.image.startsWith("uploads/")
          ? `${baseUrl}/${b.image}`
          : `${baseUrl}/storage/${b.image}`
        : null,
      className: "bg-zinc-950 border border-zinc-800",
    }));
  }, [promoQuery.data, baseUrl]);

  const articlesQuery = useQuery({
    queryKey: ["articles", { pinned: true, limit: 5 }],
    queryFn: async () =>
      (await api.get("/articles", { params: { pinned: 1, limit: 5 } })).data
        .articles,
  });

  const articleSlides = useMemo(() => {
    const list = articlesQuery.data ?? [];
    return list.map((a) => ({
      ...a,
      cover_image: a.cover_image
        ? a.cover_image.startsWith("uploads/")
          ? `${baseUrl}/${a.cover_image}`
          : `${baseUrl}/storage/${a.cover_image}`
        : null,
    }));
  }, [articlesQuery.data, baseUrl]);

  if (query.isLoading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-zinc-700" size={32} />
      </div>
    );

  if (query.isError)
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-400">
        Failed to load dashboard.
      </div>
    );

  const stats = query.data.stats;

  return (
    <div className="space-y-8 pb-10">
      {/* Header & Elite Trainer Card */}
      <section className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 lg:max-w-[60%]">
          <div className="mb-4">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <Sparkles
                className="text-[var(--accent)]"
                size={24}
                fill="currentColor"
              />
              Coach Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Manage your community and track earnings.
            </p>
          </div>
          <PromoCarousel
            slides={
              promoSlides.length
                ? promoSlides
                : [
                    {
                      kicker: "Trainer Elite",
                      title: "Monitor Member Activity",
                      subtitle:
                        "Pantau perkembangan member dalam satu dashboard.",
                      className: "bg-zinc-900 border border-zinc-800",
                    },
                  ]
            }
          />
        </div>

        {/* Trainer Stats Wallet Style */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 lg:w-96 flex flex-col justify-between shadow-2xl">
          <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-[var(--accent)] opacity-[0.03] blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 border-zinc-800 bg-zinc-900 shadow-inner">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[var(--accent)]">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white uppercase tracking-tight">
                {user?.full_name}
              </div>
              <div className="text-[10px] font-medium text-emerald-500 uppercase tracking-widest">
                Certified Trainer
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <Wallet size={12} className="text-[var(--accent)]" />
              Accumulated Points
            </div>
            <div className="mt-1 text-3xl font-black text-white tabular-nums tracking-tighter">
              {Number(stats.total_points).toLocaleString("id-ID")}
            </div>
            <div className="text-xs font-semibold text-zinc-400 mt-1">
              ≈ Rp{" "}
              {Number(stats.total_points_rupiah ?? 0).toLocaleString("id-ID")}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <Link
              to="/trainer/points"
              className="rounded-xl bg-zinc-900 py-2.5 text-center text-[11px] font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              Point Logs
            </Link>
            <Link
              to="/trainer/points"
              className="rounded-xl bg-[var(--accent)] py-2.5 text-center text-[11px] font-bold text-[var(--accent-foreground)] hover:brightness-110 transition-all"
            >
              Withdraw
            </Link>
          </div>
        </div>
      </section>

      {/* Main Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Users size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Total Members
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {stats.total_members}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
              <TrendingUp size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Month Earning
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {stats.month_earning_points}{" "}
            <span className="text-[10px] text-zinc-500 uppercase tracking-normal">
              Pts
            </span>
          </div>
        </div>
      </section>

      {/* Quick Menu */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
          Quick Access
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              to: "/trainer/dashboard",
              label: "Overview",
              icon: LayoutDashboard,
            },
            { to: "/trainer/referrals", label: "Members", icon: Users },
            { to: "/trainer/points", label: "Points", icon: Coins },
            { to: "/trainer/feed", label: "Flamehub", icon: FileText },
            { to: "/trainer/profile", label: "Profile", icon: User },
            {
              to: "#activity",
              label: "Activity",
              icon: TrendingUp,
              type: "hash",
            },
          ].map((item, idx) => (
            <Link
              key={idx}
              to={item.type === "hash" ? "#" : item.to}
              onClick={() =>
                item.type === "hash" &&
                document
                  .getElementById("activity")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-800/40 bg-zinc-900/20 p-4 transition-all hover:border-[var(--accent)]/50 active:scale-95"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-zinc-400 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)] transition-colors">
                <item.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white uppercase tracking-tight">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Referral Link Section */}
      <section className="bg-zinc-950 rounded-3xl border border-(--accent)/20 p-2 overflow-hidden shadow-xl shadow-emerald-950/10">
        <ReferralLink />
      </section>

      {/* Latest Stories Section */}
      <section>
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-white">Coach Feed</h2>
          <Link
            to="/trainer/feed"
            className="flex items-center gap-1 text-xs font-bold text-[var(--accent)]"
          >
            Explore <ChevronRight size={14} />
          </Link>
        </div>
        <ArticleCarousel articles={articleSlides} basePath="/trainer" />
      </section>

      {/* Lists Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Members */}
        <div id="recent-members">
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white uppercase italic tracking-tight">
              Recent Members
            </h2>
          </div>
          <div className="space-y-3">
            {(query.data.recent_members ?? []).length ? (
              query.data.recent_members.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 uppercase">
                      {m.full_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white tracking-tight">
                        {m.full_name}
                      </div>
                      <div className="truncate text-[11px] text-zinc-500 font-medium tracking-tight">
                        @{m.username}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-zinc-700 group-hover:text-zinc-400 transition-colors"
                  />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                  No members yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div id="activity" className="scroll-mt-24">
          <div className="mb-4 px-1">
            <h2 className="text-lg font-bold text-white uppercase italic tracking-tight">
              Live Activity
            </h2>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            <MemberActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
