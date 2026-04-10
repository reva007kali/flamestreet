import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";
import PromoCarousel from "@/components/common/PromoCarousel";
import { useAuthStore } from "@/store/authStore";
import { useMemo } from "react";
import ArticleCarousel from "@/components/common/ArticleCarousel";
import {
  CreditCard,
  FileText,
  ListOrdered,
  Menu,
  ShoppingCart,
  Star,
  Tag,
  User,
} from "lucide-react";

export default function Home() {
  const setUser = useAuthStore((s) => s.setUser);
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

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data.user,
    onSuccess: (u) => setUser(u),
  });

  const pointsQuery = useQuery({
    queryKey: ["member", "points"],
    queryFn: async () => (await api.get("/member/points")).data,
    enabled: (user?.roles ?? []).includes("member"),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.categories,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", { limit: 3 }],
    queryFn: async () => (await api.get("/orders")).data,
  });

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

  const featuredQuery = useQuery({
    queryKey: ["products", { featured: true }],
    queryFn: async () =>
      (await api.get("/products", { params: { featured: 1 } })).data.data,
  });

  const promoQuery = useQuery({
    queryKey: ["promo-banners", { audience: "member" }],
    queryFn: async () =>
      (await api.get("/promo-banners", { params: { audience: "member" } })).data
        .banners,
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

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-3">
        {/* promotion banner */}
        <div className=" sm:mx-0 lg:col-span-2">
          <PromoCarousel
            slides={
              promoSlides.length
                ? promoSlides
                : [
                    {
                      kicker: "Flame Street",
                      title: "Protein meals for post-workout",
                      subtitle:
                        "Order cepat, delivery terjadwal, dan kumpulkan point dari setiap pembelian.",
                      className: "bg-gradient-to-br from-zinc-950 to-zinc-900",
                    },
                    {
                      kicker: "Rewards",
                      title: "Kumpulkan point dari setiap order",
                      subtitle:
                        "Point reward dari product, bisa dipakai untuk potongan saat redeem.",
                      className:
                        "bg-gradient-to-br from-emerald-950/40 to-zinc-950",
                    },
                    {
                      kicker: "Promo",
                      title: "Cek menu terbaru minggu ini",
                      subtitle: "Klik Browse Menu untuk lihat item featured.",
                      className:
                        "bg-gradient-to-br from-zinc-950 to-emerald-950/30",
                    },
                  ]
            }
          />
        </div>

        {/* Member Profile */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
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
                    {(user?.full_name ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {user?.full_name ?? "Member"}
                </div>
                <div className="truncate text-xs text-zinc-500">
                  @{user?.username ?? "-"}
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs text-zinc-400">Points</div>
              <div className="text-lg font-semibold">
                {pointsQuery.data?.balance ??
                  user?.member_profile?.total_points ??
                  0}
              </div>
              <div className="text-xs text-zinc-400">
                Rp{" "}
                {Number(pointsQuery.data?.balance_rupiah ?? 0).toLocaleString(
                  "id-ID",
                )}
              </div>
            </div>
          </div>
          {meQuery.isError ? (
            <div className="mt-3 text-xs text-red-300">
              Failed to load profile.
            </div>
          ) : null}
        </div>
      </section>

      {/* Quick Menu */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quick Menu</h2>
        </div>
        {/* menu grid list */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            to="/member/menu"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <Menu className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Flame Meals{" "}
            </div>
          </Link>
          <Link
            to="/member/cart"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <ShoppingCart className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Cart
            </div>
          </Link>
          <Link
            to="/member/checkout"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <CreditCard className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Checkout
            </div>
          </Link>
          <Link
            to="/member/orders"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <ListOrdered className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Orders
            </div>
          </Link>
          <Link
            to="/member/profile"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <User className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Profile
            </div>
          </Link>
          <Link
            to="/member/articles"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <FileText className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Articles
            </div>
          </Link>
          <a
            href="#categories"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <Tag className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Explore
            </div>
          </a>
          <a
            href="#featured"
            className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-center backdrop-blur hover:border-zinc-700"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <Star className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="mt-2 text-[11px] font-medium text-zinc-200">
              Featured
            </div>
          </a>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Articles</h2>
          <Link
            to="/member/articles"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            View all
          </Link>
        </div>
        <ArticleCarousel articles={articleSlides} basePath="/member" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link
            to="/member/orders"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(ordersQuery.data?.data ?? []).slice(0, 3).map((o) => (
            <Link
              key={o.id}
              to={`/orders/${o.order_number}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700"
            >
              <div className="font-medium">{o.order_number}</div>
              <div className="mt-1 text-sm text-zinc-400 capitalize">
                {o.status} • {o.payment_status}
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Rp {Number(o.total_amount ?? 0).toLocaleString("id-ID")}
              </div>
            </Link>
          ))}
          {ordersQuery.isLoading ? (
            <div className="text-sm text-zinc-400">Loading...</div>
          ) : null}
        </div>
      </section>

      <section id="categories">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Categories</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {(categoriesQuery.data ?? []).map((c) => (
            <Link
              key={c.id}
              to={`/member/menu?category=${encodeURIComponent(c.slug)}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700"
            >
              <div className="font-medium">{c.name}</div>
              {c.description ? (
                <div className="mt-1 text-sm text-zinc-400">
                  {c.description}
                </div>
              ) : null}
            </Link>
          ))}
          {categoriesQuery.isLoading ? (
            <div className="text-sm text-zinc-400">Loading...</div>
          ) : null}
        </div>
      </section>

      <section id="featured">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Featured</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {(featuredQuery.data ?? []).map((p) => (
            <Link
              key={p.id}
              to={`/member/product/${p.slug}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700"
            >
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 text-sm text-zinc-400">
                Rp {Number(p.price ?? 0).toLocaleString("id-ID")}
              </div>
            </Link>
          ))}
          {featuredQuery.isLoading ? (
            <div className="text-sm text-zinc-400">Loading...</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
