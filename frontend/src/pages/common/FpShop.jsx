import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { ChevronLeft, Loader2, ShoppingBag, Ticket } from "lucide-react";

function calcCouponDiscount(item, subtotalValue) {
  if (!item || String(item.type) !== "coupon") return 0;
  if (!item.is_active) return 0;
  const now = Date.now();
  const startsAt = item.starts_at ? new Date(item.starts_at).getTime() : null;
  const endsAt = item.ends_at ? new Date(item.ends_at).getTime() : null;
  if (startsAt && now < startsAt) return 0;
  if (endsAt && now > endsAt) return 0;

  const subtotalNum = Number(subtotalValue) || 0;
  const minSubtotal = item.min_subtotal != null ? Number(item.min_subtotal) : null;
  if (minSubtotal != null && subtotalNum < minSubtotal) return 0;

  const type = String(item.discount_type ?? "");
  const value = Number(item.discount_value ?? 0) || 0;
  if (value <= 0) return 0;

  let d = 0;
  if (type === "fixed") d = value;
  else if (type === "percent") d = (subtotalNum * value) / 100;
  else return 0;

  const maxDiscount = item.max_discount != null ? Number(item.max_discount) : null;
  if (maxDiscount != null && d > maxDiscount) d = maxDiscount;
  if (d < 0) d = 0;
  if (d > subtotalNum) d = subtotalNum;
  return d;
}

export default function FpShop({ basePath }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isTrainer = (user?.roles ?? []).includes("trainer");
  const isMember = (user?.roles ?? []).includes("member");

  const resolvedBase = useMemo(() => {
    if (basePath) return String(basePath);
    if (location.pathname.startsWith("/trainer")) return "/trainer";
    return "/member";
  }, [basePath, location.pathname]);

  const pointsQuery = useQuery({
    queryKey: ["fp-shop", "points", isTrainer ? "trainer" : "member"],
    queryFn: async () => {
      if (isTrainer) return (await api.get("/trainer/points")).data;
      return (await api.get("/member/points")).data;
    },
    enabled: isTrainer || isMember,
  });

  const itemsQuery = useQuery({
    queryKey: ["fp-shop", "items", "coupon"],
    queryFn: async () =>
      (await api.get("/fp-shop/items", { params: { type: "coupon" } })).data
        .items ?? [],
    enabled: isTrainer || isMember,
    staleTime: 10_000,
  });

  const myCouponsQuery = useQuery({
    queryKey: ["fp-shop", "purchases", "coupon", "available"],
    queryFn: async () =>
      (
        await api.get("/fp-shop/purchases", {
          params: { type: "coupon", status: "available" },
        })
      ).data.purchases ?? [],
    enabled: isTrainer || isMember,
    staleTime: 5_000,
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const buyMutation = useMutation({
    mutationFn: async (itemId) => {
      return (await api.post(`/fp-shop/items/${Number(itemId)}/buy`)).data
        .purchase;
    },
    onSuccess: () => {
      setError(null);
      setSuccess("Berhasil beli kupon.");
      myCouponsQuery.refetch();
      itemsQuery.refetch();
      pointsQuery.refetch();
    },
    onError: (e) => {
      setSuccess(null);
      setError(e?.response?.data?.message ?? "Gagal beli kupon");
    },
  });

  const pointsBalance = Number(pointsQuery.data?.balance ?? 0) || 0;
  const coupons = (itemsQuery.data ?? []).filter((x) => x && x.type === "coupon");
  const ownedCount = (myCouponsQuery.data ?? []).length;

  return (
    <div className="mx-auto max-w-2xl pb-28 px-3">
      <div className="mb-8 flex items-end justify-between px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`${resolvedBase}`}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </Link>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                FP Shop
              </div>
              <h1 className="truncate text-lg font-black uppercase tracking-tight text-white">
                Kupon Diskon
              </h1>
            </div>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-white/45">
            Beli kupon pakai Flame Points (FP). Kupon bisa dipakai di Checkout.
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            Balance
          </div>
          <div className="mt-1 text-[13px] font-black text-white tabular-nums">
            {pointsBalance.toLocaleString("id-ID")} FP
          </div>
          <div className="mt-1 text-[10px] font-bold text-white/35 uppercase tracking-widest">
            My Kupon: {ownedCount}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] font-semibold text-rose-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[11px] font-semibold text-emerald-200">
          {success}
        </div>
      ) : null}

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Coupons
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            FP only
          </div>
        </div>

        {itemsQuery.isLoading ? (
          <div className="px-2 py-6 text-center text-sm font-semibold text-zinc-400">
            <Loader2 size={14} className="inline mr-2 animate-spin" />
            Loading…
          </div>
        ) : coupons.length ? (
          <div className="space-y-2">
            {coupons.map((it) => {
              const fp = Number(it.fp_price ?? 0) || 0;
              const canBuy = pointsBalance >= fp;
              const label =
                it.discount_type === "percent"
                  ? `${Number(it.discount_value ?? 0)}%`
                  : `Rp ${Number(it.discount_value ?? 0).toLocaleString("id-ID")}`;
              const min =
                it.min_subtotal != null
                  ? `Min Rp ${Number(it.min_subtotal).toLocaleString("id-ID")}`
                  : "";
              const max =
                it.max_discount != null
                  ? `Max Rp ${Number(it.max_discount).toLocaleString("id-ID")}`
                  : "";

              return (
                <div
                  key={it.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-zinc-950/60">
                          <Ticket size={16} className="text-[var(--accent)]" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-black text-white">
                            {it.name}
                          </div>
                          <div className="mt-0.5 text-[11px] font-semibold text-white/50">
                            {label}
                            {min ? ` • ${min}` : ""}
                            {max ? ` • ${max}` : ""}
                          </div>
                        </div>
                      </div>
                      {it.description ? (
                        <div className="mt-3 text-[11px] font-semibold text-white/40">
                          {it.description}
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-black text-white/70 tabular-nums">
                        {fp.toLocaleString("id-ID")} FP
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSuccess(null);
                          setError(null);
                          buyMutation.mutate(it.id);
                        }}
                        disabled={buyMutation.isPending || !canBuy}
                        className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] disabled:opacity-30 disabled:grayscale"
                      >
                        {buyMutation.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          "Beli"
                        )}
                      </button>
                      {!canBuy ? (
                        <div className="mt-2 text-[10px] font-bold text-rose-300 uppercase tracking-widest">
                          FP kurang
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-2 py-6 text-center text-sm font-semibold text-zinc-400">
            Belum ada kupon.
          </div>
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Merchandise
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            Coming soon
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-zinc-950/60">
              <ShoppingBag size={18} className="text-white/60" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-black text-white">
                FP Shop akan support merch
              </div>
              <div className="mt-1 text-[11px] font-semibold text-white/40">
                Untuk checkout, yang ditampilkan hanya kupon diskon.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

