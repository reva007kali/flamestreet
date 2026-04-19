import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ChatFab from "@/components/chat/ChatFab";
import {
  CreditCard,
  Menu as MenuIcon,
  ReceiptText,
  MapPin,
  Flame,
  ShoppingCart,
  ChevronRight,
  Bell,
} from "lucide-react";

export default function Home() {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const baseUrl = useMemo(() => {
    const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
    return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
  }, []);

  const toAssetUrl = useMemo(() => {
    return (p) => {
      if (!p) return null;
      const v = String(p).trim();
      if (!v) return null;
      if (/^https?:\/\//i.test(v)) return v;
      if (v.startsWith("uploads/")) return `${baseUrl}/${v}`;
      if (v.startsWith("storage/")) return `${baseUrl}/${v}`;
      return `${baseUrl}/storage/${v}`;
    };
  }, [baseUrl]);

  const avatarUrl = useMemo(
    () => toAssetUrl(user?.avatar),
    [toAssetUrl, user?.avatar],
  );

  // -- LOGIC TETAP SAMA --
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

  const ordersQuery = useQuery({
    queryKey: ["orders", { limit: 3 }],
    queryFn: async () => (await api.get("/orders")).data,
  });

  const weeklyNutritionQuery = useQuery({
    queryKey: ["member", "nutrition", "weekly"],
    queryFn: async () => (await api.get("/member/nutrition/weekly")).data,
    staleTime: 20_000,
  });

  const featuredQuery = useQuery({
    queryKey: ["products", { featured: true }],
    queryFn: async () =>
      (await api.get("/products", { params: { featured: 1 } })).data.data,
  });

  const flamehubQuery = useQuery({
    queryKey: ["flamehub", "feed", "home"],
    queryFn: async () => (await api.get("/flamehub/feed")).data.data,
  });

  const gymsQuery = useQuery({
    queryKey: ["gyms"],
    queryFn: async () => (await api.get("/gyms")).data.gyms,
    enabled: (user?.roles ?? []).includes("member"),
  });

  const promoQuery = useQuery({
    queryKey: ["promo-banners", { audience: "member" }],
    queryFn: async () =>
      (await api.get("/promo-banners", { params: { audience: "member" } })).data
        .banners,
  });

  const fallbackBanners = useMemo(
    () => [
      {
        id: "b1",
        title: "Green Week",
        subtitle: "Diskon menu pilihan",
        imageUrl: null,
      },
      {
        id: "b2",
        title: "Free Delivery",
        subtitle: "Untuk area tertentu",
        imageUrl: null,
      },
      {
        id: "b3",
        title: "Flame Points",
        subtitle: "Kumpulkan & tukar",
        imageUrl: null,
      },
    ],
    [],
  );

  const banners = useMemo(() => {
    const list = promoQuery.data ?? [];
    const mapped = list
      .filter((b) => b && (b.title || b.subtitle || b.image))
      .map((b) => ({
        id: b.id ?? `${b.title ?? "promo"}-${Math.random()}`,
        title: b.title ?? "Promo",
        subtitle: b.subtitle ?? "",
        imageUrl: toAssetUrl(b.image),
      }));
    return mapped.length ? mapped : fallbackBanners;
  }, [fallbackBanners, promoQuery.data, toAssetUrl]);

  // -- SLIDER LOGIC REFINED --
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerListRef = useRef(null);
  const isInteracting = useRef(false);

  const scrollToBanner = useCallback((index) => {
    const el = bannerListRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: index * w, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      if (isInteracting.current) return;
      const next = (bannerIndex + 1) % banners.length;
      scrollToBanner(next);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerIndex, banners.length, scrollToBanner]);

  const onBannerScroll = (e) => {
    const el = e.currentTarget;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    if (idx !== bannerIndex) setBannerIndex(idx);
  };

  const featured = useMemo(
    () => (featuredQuery.data ?? []).slice(0, 10),
    [featuredQuery.data],
  );
  const flamePosts = useMemo(
    () => (flamehubQuery.data ?? []).slice(0, 5),
    [flamehubQuery.data],
  );
  const recentOrders = useMemo(
    () => (ordersQuery.data?.data ?? []).slice(0, 3),
    [ordersQuery.data],
  );

  const defaultAddressText = useMemo(() => {
    const defGymId = user?.member_profile?.default_gym_id;
    if (!defGymId) return "";
    const g = (gymsQuery.data ?? []).find(
      (x) => Number(x.id) === Number(defGymId),
    );
    if (!g) return "";
    return [g.gym_name, g.address].filter(Boolean).join(", ");
  }, [gymsQuery.data, user?.member_profile?.default_gym_id]);

  return (
    <div className="pb-24 px-3 bg-black min-h-screen text-white overflow-x-hidden">
      {/* BANNER SECTION - IMPROVED UX */}
      <section className="relative aspect-video w-full my-4">
        <div
          ref={bannerListRef}
          onScroll={onBannerScroll}
          onTouchStart={() => (isInteracting.current = true)}
          onTouchEnd={() => (isInteracting.current = false)}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {banners.map((b) => (
            <div
              key={String(b.id)}
              className="relative h-full w-full shrink-0 snap-start"
            >
              {b.imageUrl ? (
                <img
                  alt=""
                  src={b.imageUrl}
                  className="absolute inset-0 h-full w-full object-cover rounded-3xl overflow-hidden border border-zinc-800"
                />
              ) : (
                <div className="absolute inset-0" />
              )}
              {/* <div className="absolute h-1/2 w-full bottom-0 bg-linear-to-t from-black via-black/10 to-transparent" /> */}
            </div>
          ))}
        </div>

        {/* Banner Indicators - Better Position */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToBanner(idx)}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === bannerIndex
                  ? "w-6 bg-[var(--accent)]"
                  : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </section>

      {/* MEMBER CARD - MORE COMPACT & ELEVATED */}
      <section className="relative z-10">
        <div className="flex items-center justify-between bg-linear-to-br from-emerald-800 via-emerald-950 border border-zinc-800 to-black p-4 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-(--accent) bg-zinc-800">
              {avatarUrl ? (
                <img
                  alt=""
                  src={avatarUrl}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-black text-(--accent)">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs">Hi Flamer!</span>
              <div className="truncate text-base pr-2 font-black uppercase leading-none text-white">
                {user?.full_name?.split(" ")[0] ?? "Member"}
              </div>
            </div>
          </div>

          <div className="text-right flex items-center gap-2">
            <div>
              <div className="text-[10px] tracking-widest text-white/60">
                Flame Points
              </div>
              <div className="text-lg font-semibold tabular-nums text-white">
                {Number(pointsQuery.data?.balance ?? 0).toLocaleString("id-ID")}
              </div>
            </div>
            <div className="w-5 h-5">
              <img className="h-full" src="/flame-icon.png" alt="" />
            </div>
          </div>
        </div>
        {defaultAddressText && (
          <div className="mt-4 flex items-center gap-2 px-2">
            <MapPin size={12} className="text-(--accent) shrink-0" />
            <div className="truncate text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
              <span className="text-white/80">{defaultAddressText}</span>
            </div>
          </div>
        )}
      </section>

      {/* DISCOVERY GRID - MORE APP-LIKE */}
      <section className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/member/menu"
            className="group relative block overflow-hidden rounded-[24px] border border-white/10 bg-[#141416] transition-all active:scale-95"
          >
            {/* image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <img
                src="/flame-meal2.webp"
                alt="Flame Meal"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(10,10,12,0.85)]" />
            </div>

            {/* bottom */}
            <div className="flex items-center justify-between gap-2 px-4 py-3.5">
              <div>
                <div className="text-sm font-black text-white">
                  Order Flame Meal
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-white/30">
                  High protein · Fresh daily
                </div>
              </div>
            </div>
          </Link>
          <Link
            to="/member/nutrition"
            className="relative overflow-hidden rounded-[24px] border border-white/[0.06] px-3 py-5 transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #1c1c1f 0%, #141416 100%)",
            }}
          >
            {/* glow orbs */}
            <div
              className="pointer-events-none absolute -right-[60px] -top-[60px] h-[160px] w-[160px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(9,221,97,0.12) 0%, transparent 65%)",
              }}
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-5 h-[120px] w-[120px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(9,221,97,0.06) 0%, transparent 65%)",
              }}
            />

            {/* top row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid flex-shrink-0 place-items-center">
                  <div
                    className="h-[22px] w-[22px] rounded-full p-[2.5px]"
                    style={{
                      background:
                        "conic-gradient(from 90deg, rgba(9,221,97,0.95), rgba(9,221,97,0.15), rgba(9,221,97,0.95))",
                    }}
                  >
                    <div
                      className="grid h-full w-full place-items-center rounded-full"
                      style={{ background: "#0d0d10" }}
                    >
                      <Flame className="h-5 w-5 text-[var(--accent)]" />
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-[2px]">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
                    This Week
                  </div>
                  <div className="truncate text-[15px] font-black text-white">
                    Nutrition
                  </div>
                  <div className="mt-[1px] text-[11px] font-semibold text-white/35">
                    {weeklyNutritionQuery.isLoading
                      ? "Loading…"
                      : `${Number(weeklyNutritionQuery.data?.totals?.kcal ?? 0).toLocaleString("id-ID")} kcal`}
                  </div>
                </div>
              </div>

              <ChevronRight size={18} className="flex-shrink-0 text-white/20" />
            </div>

            {/* divider */}
            {!weeklyNutritionQuery.isLoading && (
              <>
                <div
                  className="my-[14px] h-px"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.07), rgba(255,255,255,0))",
                  }}
                />

                {/* macro pill */}
                <div
                  className="flex flex-wrap items-center gap-[6px] rounded-[14px] border border-white/[0.06] px-[14px] py-[10px]"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="flex flex-1 items-baseline justify-center gap-[3px]">
                    <span className="text-[12px] font-black text-white/75">
                      {Number(
                        weeklyNutritionQuery.data?.totals?.protein_g ?? 0,
                      ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[10px] font-semibold text-white/30">
                      protein
                    </span>
                  </div>

                  <div className="h-4 w-px flex-shrink-0 bg-white/[0.07]" />

                  <div className="flex flex-1 items-baseline justify-center gap-[3px]">
                    <span className="text-[12px] font-black text-white/75">
                      {Number(
                        weeklyNutritionQuery.data?.totals?.carbs_g ?? 0,
                      ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[10px] font-semibold text-white/30">
                      carbs
                    </span>
                  </div>

                  <div className="h-4 w-px flex-shrink-0 bg-white/[0.07]" />

                  <div className="flex flex-1 items-baseline justify-center gap-[3px]">
                    <span className="text-[12px] font-black text-white/75">
                      {Number(
                        weeklyNutritionQuery.data?.totals?.fat_g ?? 0,
                      ).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[10px] font-semibold text-white/30">
                      fat
                    </span>
                  </div>
                </div>
              </>
            )}
          </Link>
        </div>
      </section>

      {/* WEEKLY POPULAR - CLEANER SLIDER */}
      <section className="pt-8">
        <div className="flex items-center justify-between  mb-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
            Top Flame Meals
          </h3>
          <Link
            to="/member/menu"
            className="text-[10px] font-black text-emerald-600 uppercase"
          >
            See All
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto  pb-4 snap-x no-scrollbar">
          {featured.map((p) => (
            <Link
              key={p.id}
              to={`/member/product/${p.slug}`}
              className="w-40 shrink-0 snap-start group"
            >
              <div className="aspect-4/5 overflow-hidden rounded-3xl bg-zinc-900 border border-white/5 transition-transform group-active:scale-95">
                {p.image ? (
                  <img
                    alt=""
                    src={toAssetUrl(p.image)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-zinc-800" />
                )}
              </div>
              <div className="mt-2">
                <div className="truncate text-xs font-black uppercase text-white leading-tight">
                  {p.name}
                </div>
                <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                  Rp {Number(p.price ?? 0).toLocaleString("id-ID")}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* RECENT ORDERS */}
      <section className="pt-8">
        <h3 className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
          Recent Orders
        </h3>
        <div className="flex flex-col gap-3">
          {recentOrders.map((o) => {
            const isDelivered = ["completed", "delivered"].includes(
              o?.status?.toLowerCase(),
            );
            return (
              <Link key={o.id} to={`/orders/${o.order_number}`}>
                <div
                  className={`flex items-center justify-between rounded-[20px] border p-4 gap-3 transition-all active:scale-[0.98] ${
                    isDelivered
                      ? "border-emerald-500/15 bg-gradient-to-br from-emerald-900/50 to-[#0a1a12]/35"
                      : "border-white/[0.07] bg-gradient-to-br from-[#1c1c20]/95 to-[#141418]/98"
                  }`}
                >
                  {/* left */}
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="truncate text-[13px] font-black uppercase italic text-white">
                      {o.items?.slice(0, 1).map((it) => it.product_name)}
                      {o.items?.length > 1
                        ? ` & ${o.items.length - 1} more`
                        : ""}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-[5px] w-[5px] flex-shrink-0 rounded-full ${
                          isDelivered
                            ? "bg-emerald-500"
                            : "bg-orange-500 animate-pulse"
                        }`}
                      />
                      <span
                        className={`text-[9px] font-black uppercase tracking-[0.06em] ${
                          isDelivered ? "text-emerald-500" : "text-orange-500"
                        }`}
                      >
                        {o.status}
                      </span>
                      <span className="text-[9px] text-white/10">·</span>
                      <span className="text-[9px] font-black uppercase text-white/25">
                        #{o.order_number}
                      </span>
                    </div>
                  </div>

                  {/* right */}
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <div className="text-[13px] font-black tracking-tight text-white">
                      Rp {Number(o.total_amount).toLocaleString("id-ID")}
                    </div>
                    <ChevronRight size={14} className="text-white/20" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* HIDDEN LOADING STATE LOGIC KEPT */}
      {meQuery.isLoading || promoQuery.isLoading ? (
        <div className="sr-only">Loading…</div>
      ) : null}

      <ChatFab to="/member/chats" />

      {/* Global CSS for scrollbar hiding */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
