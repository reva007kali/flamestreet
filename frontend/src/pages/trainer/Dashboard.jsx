import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import ReferralLink from "@/components/trainer/ReferralLink";
import MemberActivityFeed from "@/components/trainer/MemberActivityFeed";
import PromoCarousel from "@/components/common/PromoCarousel";
import { useAuthStore } from "@/store/authStore";
import { useMemo } from "react";
import ArticleCarousel from "@/components/common/ArticleCarousel";
import { Coins, FileText, LayoutDashboard, Users, User } from "lucide-react";
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
    if (p.startsWith("uploads/")) return `${baseUrl}/${p}`;
    return `${baseUrl}/storage/${p}`;
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
      kicker: b.kicker ?? "Promo",
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.image
        ? b.image.startsWith("uploads/")
          ? `${baseUrl}/${b.image}`
          : `${baseUrl}/storage/${b.image}`
        : null,
      className: "bg-zinc-950",
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

  if (query.isLoading) return <div className="text-zinc-400">Loading...</div>;
  if (query.isError)
    return <div className="text-red-300">Failed to load dashboard.</div>;

  const stats = query.data.stats;

  return (
    <div className="space-y-4">
      <PromoCarousel
        slides={
          promoSlides.length
            ? promoSlides
            : [
                {
                  kicker: "Trainer",
                  title: "Pantau member & point dalam satu tempat",
                  subtitle:
                    "Bagikan referral link dan lihat activity realtime.",
                  className: "bg-gradient-to-br from-zinc-950 to-zinc-900",
                },
                {
                  kicker: "Rewards",
                  title: "Point bertambah dari referral & order member",
                  subtitle: "Redeem kapan saja sesuai minimum redeem points.",
                  className:
                    "bg-gradient-to-br from-emerald-950/40 to-zinc-950",
                },
              ]
        }
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-300">
                  {(user?.full_name ?? "T").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {user?.full_name ?? "Trainer"}
              </div>
              <div className="truncate text-xs text-zinc-500">
                @{user?.username ?? "-"}
              </div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-zinc-400">Points</div>
            <div className="text-lg font-semibold">{stats.total_points}</div>
            <div className="text-xs text-zinc-400">
              Rp{" "}
              {Number(stats.total_points_rupiah ?? 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quick Menu</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Link
            to="/trainer/dashboard"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <LayoutDashboard className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Dashboard
            </div>
          </Link>
          <Link
            to="/trainer/referrals"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <Users className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              My Members
            </div>
          </Link>
          <Link
            to="/trainer/points"
            className="rounded-2xl  border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <Coins className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-300">
              Points
            </div>
          </Link>
          <Link
            to="/trainer/feed"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <FileText className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Feed
            </div>
          </Link>
          <Link
            to="/trainer/profile"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <User className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Profile
            </div>
          </Link>
          <a
            href="#activity"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <LayoutDashboard className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Activity
            </div>
          </a>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Feed</h2>
          <Link
            to="/trainer/feed"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            View all
          </Link>
        </div>
        <ArticleCarousel articles={articleSlides} basePath="/trainer" />
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">Total Members</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats.total_members}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">Month Earning (points)</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats.month_earning_points}
          </div>
        </div>
      </div>

      <ReferralLink />

      <div className="grid gap-3 md:grid-cols-2">
        <div
          id="recent-members"
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        >
          <div className="font-medium">Recent Members</div>
          <div className="mt-3 space-y-2">
            {(query.data.recent_members ?? []).length ? (
              query.data.recent_members.map((m) => (
                <div
                  key={m.id}
                  className="rounded border border-zinc-800 bg-zinc-950 p-3 text-sm"
                >
                  <div className="text-zinc-200">{m.full_name}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    @{m.username}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-400">No members yet.</div>
            )}
          </div>
        </div>

        <div id="activity">
          <MemberActivityFeed />
        </div>
      </div>
    </div>
  );
}
