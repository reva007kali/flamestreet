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
  Menu as MenuIcon,
  ShoppingCart,
  Star,
  Tag,
  User,
  ChevronRight,
  Wallet,
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
    return p.startsWith("uploads/") ? `${baseUrl}/${p}` : `${baseUrl}/storage/${p}`;
  }, [baseUrl, user?.avatar]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

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
    queryFn: async () => (await api.get("/articles", { params: { pinned: 1, limit: 5 } })).data.articles,
  });

  const articleSlides = useMemo(() => {
    const list = articlesQuery.data ?? [];
    return list.map((a) => ({
      ...a,
      cover_image: a.cover_image
        ? a.cover_image.startsWith("uploads/") ? `${baseUrl}/${a.cover_image}` : `${baseUrl}/storage/${a.cover_image}`
        : null,
    }));
  }, [articlesQuery.data, baseUrl]);

  const featuredQuery = useQuery({
    queryKey: ["products", { featured: true }],
    queryFn: async () => (await api.get("/products", { params: { featured: 1 } })).data.data,
  });

  const promoQuery = useQuery({
    queryKey: ["promo-banners", { audience: "member" }],
    queryFn: async () => (await api.get("/promo-banners", { params: { audience: "member" } })).data.banners,
  });

  const promoSlides = useMemo(() => {
    const banners = promoQuery.data ?? [];
    return banners.map((b) => ({
      kicker: b.kicker ?? "Promo",
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.image
        ? b.image.startsWith("uploads/") ? `${baseUrl}/${b.image}` : `${baseUrl}/storage/${b.image}`
        : null,
      className: "bg-zinc-950",
    }));
  }, [promoQuery.data, baseUrl]);

  return (
    <div className="space-y-10 pb-10">
      {/* Header & Membership Section */}
      <section className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 lg:max-w-[65%]">
          <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {greeting}, <span className="text-[var(--accent)]">{user?.full_name?.split(' ')[0] ?? 'Member'}!</span>
            </h1>
            <p className="text-sm text-zinc-500">Ready for your healthy meal today?</p>
          </div>
          <PromoCarousel
            slides={promoSlides.length ? promoSlides : [
              { kicker: "Flame Street", title: "Protein meals for post-workout", subtitle: "Order cepat & kumpulkan point.", className: "bg-zinc-900 border border-zinc-800" }
            ]}
          />
        </div>

        {/* Member Card Style */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 lg:w-80 flex flex-col justify-between shadow-2xl shadow-emerald-950/20">
          <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-[var(--accent)] opacity-[0.03] blur-3xl" />
          
          <div className="relative z-10 flex items-center gap-3">
             <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 border-zinc-800 bg-zinc-900 shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[var(--accent)]">
                    {(user?.full_name ?? "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white uppercase tracking-tight">{user?.full_name ?? "Member"}</div>
                <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">Premium Member</div>
              </div>
          </div>

          <div className="relative z-10 mt-10">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
               <Wallet size={12} className="text-[var(--accent)]" /> 
               Flame Points
            </div>
            <div className="mt-1 text-3xl font-black text-white tabular-nums tracking-tighter">
              {Number(pointsQuery.data?.balance ?? 0).toLocaleString("id-ID")}
            </div>
            <div className="text-xs font-semibold text-zinc-400">
               ≈ Rp {Number(pointsQuery.data?.balance_rupiah ?? 0).toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Menu - 4 Columns Grid */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Quick Access</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { to: "/member/menu", label: "Menu", icon: MenuIcon },
            { to: "/member/cart", label: "Cart", icon: ShoppingCart },
            { to: "/member/checkout", label: "Checkout", icon: CreditCard },
            { to: "/member/profile", label: "Profile", icon: User },
          ].map((item, idx) => (
            item.type === 'hash' ? (
              <a key={idx} href={item.to} className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-4 transition-all hover:border-[var(--accent)]/50 active:scale-95">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-zinc-400 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)] transition-colors">
                  <item.icon size={18} />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white">{item.label}</span>
              </a>
            ) : (
              <Link key={idx} to={item.to} className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-800/40 bg-zinc-900/30 p-4 transition-all hover:border-[var(--accent)]/50 active:scale-95">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-zinc-400 group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)] transition-colors">
                  <item.icon size={18} />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white">{item.label}</span>
              </Link>
            )
          ))}
        </div>
      </section>

      {/* Article Feed */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Latest Feed</h2>
          <Link to="/member/feed" className="flex items-center gap-1 text-xs font-bold text-[var(--accent)]">
            Explore <ChevronRight size={14} />
          </Link>
        </div>
        <ArticleCarousel articles={articleSlides} basePath="/member" />
      </section>

      {/* Recent Orders Cards */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Recent Orders</h2>
          <Link to="/member/orders" className="text-xs font-bold text-zinc-500">History</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(ordersQuery.data?.data ?? []).slice(0, 3).map((o) => (
            <Link key={o.id} to={`/orders/${o.order_number}`} className="group relative flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition-all hover:border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">#{o.order_number}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                  {o.status}
                </span>
              </div>
              <div className="text-lg font-bold text-white">
                Rp {Number(o.total_amount ?? 0).toLocaleString("id-ID")}
              </div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase">{o.payment_status} • {new Date(o.created_at).toLocaleDateString()}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories & Featured */}
      <div className="grid gap-10 md:grid-cols-2">
        <section id="categories">
          <h2 className="mb-4 text-lg font-bold text-white">Categories</h2>
          <div className="grid grid-cols-2 gap-3">
            {(categoriesQuery.data ?? []).map((c) => (
              <Link key={c.id} to={`/member/menu?category=${encodeURIComponent(c.slug)}`} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition-all hover:border-[var(--accent)]">
                <div className="text-sm font-bold text-white">{c.name}</div>
                <div className="mt-1 text-[10px] text-zinc-500 line-clamp-1">{c.description || 'View products'}</div>
              </Link>
            ))}
          </div>
        </section>

        <section id="featured">
          <h2 className="mb-4 text-lg font-bold text-white">Featured Products</h2>
          <div className="space-y-3">
            {(featuredQuery.data ?? []).slice(0, 4).map((p) => (
              <Link key={p.id} to={`/member/product/${p.slug}`} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition-all hover:bg-zinc-900">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{p.name}</div>
                  <div className="text-xs font-semibold text-[var(--accent)]">Rp {Number(p.price ?? 0).toLocaleString("id-ID")}</div>
                </div>
                <ChevronRight size={16} className="text-zinc-700" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}