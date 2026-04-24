import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";
import { Loader2, Plus, Trash2, Ticket } from "lucide-react";

export default function FpShopItems() {
  const query = useQuery({
    queryKey: ["admin", "fp-shop", "items", "coupon"],
    queryFn: async () =>
      (await api.get("/admin/fp-shop/items", { params: { type: "coupon" } }))
        .data.items ?? [],
  });

  const del = useMutation({
    mutationFn: async (id) => api.delete(`/admin/fp-shop/items/${id}`),
    onSuccess: () => query.refetch(),
  });

  return (
    <div className="mx-auto max-w-5xl pb-24 px-3">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
            FP Shop
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Ticket size={18} className="text-[var(--accent)]" />
            Coupons
          </h1>
        </div>
        <Link
          to="/admin/fp-shop/items/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)]"
        >
          <Plus size={16} /> New
        </Link>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden">
        {query.isLoading ? (
          <div className="px-4 py-6 text-sm font-semibold text-zinc-400">
            <Loader2 size={14} className="inline mr-2 animate-spin" />
            Loading…
          </div>
        ) : (query.data ?? []).length ? (
          <div className="divide-y divide-white/5">
            {(query.data ?? []).map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <Link
                    to={`/admin/fp-shop/items/${it.id}`}
                    className="truncate text-[13px] font-black text-white hover:underline"
                  >
                    {it.name}
                  </Link>
                  <div className="mt-1 text-[11px] font-semibold text-white/45">
                    {it.discount_type === "percent"
                      ? `${Number(it.discount_value ?? 0)}%`
                      : `Rp ${Number(it.discount_value ?? 0).toLocaleString("id-ID")}`}{" "}
                    • {Number(it.fp_price ?? 0).toLocaleString("id-ID")} FP •{" "}
                    {it.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => del.mutate(it.id)}
                  disabled={del.isPending}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-sm font-semibold text-zinc-400">
            Empty.
          </div>
        )}
      </div>
    </div>
  );
}

