import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/axios";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import {
  Plus,
  ShoppingBag,
  Info,
  ChevronRight,
  Loader2,
  Sparkles,
  MapPin,
} from "lucide-react";
import { addToCart } from "@/lib/addToCart";

export default function Menu({ basePath = "/member" }) {
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const category = search.get("category") ?? "";
  const cartItems = useCartStore((s) => s.items);
  const setUser = useAuthStore((s) => s.setUser);
  const baseUrl = useMemo(
    () => (import.meta.env.VITE_API_URL ?? "").replace(/\/api\/?$/, ""),
    [],
  );
  const [coverageGymId, setCoverageGymId] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await api.get("/categories")).data.categories,
  });

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data.user,
    onSuccess: (u) => setUser(u),
  });

  const gymsQuery = useQuery({
    queryKey: ["gyms"],
    queryFn: async () => (await api.get("/gyms")).data.gyms,
  });

  const productsQuery = useQuery({
    queryKey: ["products", { category }],
    queryFn: async () =>
      (await api.get("/products", { params: category ? { category } : {} }))
        .data.data,
  });

  const cartCount = useMemo(
    () =>
      cartItems.reduce((sum, it) => sum + (Number(it.quantity ?? 1) || 1), 0),
    [cartItems],
  );
  const cartTotal = useMemo(
    () =>
      cartItems.reduce((sum, it) => {
        const price = Number(it.product?.price ?? 0);
        const qty = Number(it.quantity ?? 1) || 1;
        return sum + price * qty;
      }, 0),
    [cartItems],
  );

  function quickAdd(product) {
    if (hasModifiers(product)) {
      navigate(`${basePath}/product/${product.slug}`);
      return;
    }
    addToCart({ product, quantity: 1, modifierOptionIds: [], itemNotes: "" });
  }

  function hasModifiers(product) {
    const count = Number(product?.modifiers_count ?? 0);
    if (count > 0) return true;
    return Array.isArray(product?.modifiers) && product.modifiers.length > 0;
  }

  function imageUrl(p) {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return p.startsWith("uploads/")
      ? `${baseUrl}/${p}`
      : `${baseUrl}/storage/${p}`;
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("flamestreet_default_gym_id");
      if (stored && String(stored).trim()) {
        setCoverageGymId(String(stored).trim());
        return;
      }
    } catch {}

    const def = meQuery.data?.member_profile?.default_gym_id;
    if (def) setCoverageGymId(String(def));
  }, [meQuery.data?.member_profile?.default_gym_id]);

  useEffect(() => {
    if (!coverageGymId) return;
    try {
      localStorage.setItem("flamestreet_default_gym_id", String(coverageGymId));
    } catch {}
  }, [coverageGymId]);

  const selectedGym = useMemo(() => {
    const id = Number(coverageGymId);
    if (!id) return null;
    return (gymsQuery.data ?? []).find((g) => Number(g.id) === id) ?? null;
  }, [coverageGymId, gymsQuery.data]);

  return (
    <div className={["pb-32", cartCount ? "pb-40" : ""].join(" ")}>
      {/* Header Section */}
      <div className="mb-8 px-4">
        <p className="text-sm text-zinc-500 mt-1">
          Pilih asupan protein terbaikmu hari ini.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 bg-linear-to-br from-emerald-800 via-black/50 to-emerald-900 border border-emerald-900">
          <div className="min-w-0 flex items-center gap-2">
            <MapPin size={14} className="shrink-0 text-[var(--accent)]" />
            <div className="min-w-0">
              <div className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-white/40">
                Gym Coverage
              </div>
              <div className="truncate text-[12px] font-bold text-white">
                {selectedGym
                  ? `${selectedGym.gym_name}${selectedGym.city ? ` · ${selectedGym.city}` : ""}`
                  : gymsQuery.isLoading
                    ? "Loading…"
                    : "Pilih gym"}
              </div>
            </div>
          </div>

          <div className="relative shrink-0">
            <select
              className="h-9 appearance-none rounded-xl border border-white/10 bg-zinc-950/60 pl-3 pr-8 text-[11px] font-bold uppercase text-white/70 outline-none transition focus:border-[var(--accent)]"
              value={coverageGymId}
              onChange={(e) => setCoverageGymId(e.target.value)}
            >
              <option value="" className="bg-zinc-900 text-white">
                Select
              </option>
              {(gymsQuery.data ?? []).map((g) => (
                <option
                  key={g.id}
                  value={String(g.id)}
                  className="bg-zinc-900 text-white"
                >
                  {g.gym_name}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-white/35" />
          </div>
        </div>
      </div>

      {/* Category Pills - Horizontal Scroll */}
      <div className="sticky top-16 z-20 mb-8 bg-zinc-950/80 px-4 py-3 backdrop-blur-md border-b border-zinc-900/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            className={`shrink-0 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
              !category
                ? "bg-linear-to-br from-emerald-500 to-emerald-950 text-white"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
            onClick={() => setSearch({})}
          >
            All Items
          </button>
          {(categoriesQuery.data ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              className={`shrink-0 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                category === c.slug
                  ? "bg-linear-to-br from-emerald-900 to-black text-white"
                  : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
              }`}
              onClick={() => setSearch({ category: c.slug })}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 px-3">
        {(productsQuery.data ?? []).map((p) => (
          <div
            key={p.id}
            className="group relative flex flex-col rounded-3xl border-3 border-zinc-700/50 bg-zinc-900/30 overflow-hidden transition-all hover:border-emerald-800 hover:bg-zinc-900/50"
          >
            {/* Image Container */}
            <div
              className="relative aspect-video cursor-pointer overflow-hidden bg-zinc-950"
              onClick={() => navigate(`${basePath}/product/${p.slug}`)}
            >
              {p.image ? (
                <img
                  src={imageUrl(p.image)}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-800 italic text-xs">
                  No Image
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-60" />
            </div>

            {/* Product Details */}
            <div className="flex flex-1 flex-col p-4">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => navigate(`${basePath}/product/${p.slug}`)}
              >
                <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                  {p.name}
                </h3>
                <p className="mt-1 text-xs font-bold text-zinc-400">
                  Rp {Number(p.price ?? 0).toLocaleString("id-ID")}
                </p>
              </div>

              {/* Action Button */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    hasModifiers(p)
                      ? navigate(`${basePath}/product/${p.slug}`)
                      : quickAdd(p);
                  }}
                  className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-emerald-600 to-emerald-950 text-[10px] font-black uppercase tracking-tighter text-[var(--accent-foreground)] transition-all active:scale-95 shadow-lg shadow-[var(--accent)]/10"
                >
                  {hasModifiers(p) ? <Info size={14} /> : <Plus size={14} />}
                  {hasModifiers(p) ? "Variant" : "Tambahkan"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {productsQuery.isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600">
            <Loader2 className="animate-spin mb-2" size={32} />
            <span className="text-xs font-bold tracking-widest uppercase">
              Loading Menu...
            </span>
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 px-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <Link
            to={`${basePath}/cart`}
            className="group mx-auto flex max-w-lg items-center justify-between gap-4 rounded-3xl bg-[var(--accent)] p-4 shadow-2xl shadow-[var(--accent)]/30 ring-1 ring-white/20 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4 border-r border-black/10 pr-4">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-black/10">
                <ShoppingBag
                  className="text-[var(--accent-foreground)]"
                  size={20}
                />
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-black">
                  {cartCount}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-black/60">
                  Total Bill
                </div>
                <div className="text-sm font-black text-[var(--accent-foreground)]">
                  Rp {Number(cartTotal ?? 0).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-[var(--accent-foreground)]">
              Checkout <ChevronRight size={16} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
