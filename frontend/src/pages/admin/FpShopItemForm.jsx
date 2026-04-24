import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import { toPublicUrl } from "@/lib/assets";
import { ChevronLeft, Loader2, Save, Trash2, Upload, X } from "lucide-react";

function asNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

export default function FpShopItemForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fpPrice, setFpPrice] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const [discountType, setDiscountType] = useState("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [minSubtotal, setMinSubtotal] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState(null);

  const itemQuery = useQuery({
    queryKey: ["admin", "fp-shop", "item", id],
    enabled: !isNew,
    queryFn: async () => (await api.get(`/admin/fp-shop/items/${id}`)).data.item,
  });

  useEffect(() => {
    if (!itemQuery.data) return;
    const it = itemQuery.data;
    setName(it.name ?? "");
    setDescription(it.description ?? "");
    setFpPrice(Number(it.fp_price ?? 0));
    setIsActive(Boolean(it.is_active));
    setSortOrder(Number(it.sort_order ?? 0));
    setDiscountType(it.discount_type ?? "fixed");
    setDiscountValue(Number(it.discount_value ?? 0));
    setMinSubtotal(it.min_subtotal != null ? String(it.min_subtotal) : "");
    setMaxDiscount(it.max_discount != null ? String(it.max_discount) : "");
    setStartsAt(it.starts_at ? String(it.starts_at).slice(0, 16) : "");
    setEndsAt(it.ends_at ? String(it.ends_at).slice(0, 16) : "");
  }, [itemQuery.data]);

  const payload = useMemo(() => {
    const p = {
      type: "coupon",
      name: String(name ?? "").trim(),
      description: String(description ?? "").trim() || null,
      fp_price: Math.max(0, Math.floor(asNumber(fpPrice))),
      is_active: Boolean(isActive),
      sort_order: Math.max(0, Math.floor(asNumber(sortOrder))),
      discount_type: String(discountType || "fixed"),
      discount_value: Math.max(0, asNumber(discountValue)),
      min_subtotal: minSubtotal !== "" ? Math.max(0, asNumber(minSubtotal)) : null,
      max_discount: maxDiscount !== "" ? Math.max(0, asNumber(maxDiscount)) : null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };
    return p;
  }, [
    name,
    description,
    fpPrice,
    isActive,
    sortOrder,
    discountType,
    discountValue,
    minSubtotal,
    maxDiscount,
    startsAt,
    endsAt,
  ]);

  const save = useMutation({
    mutationFn: async () => {
      if (!payload.name) throw new Error("Name wajib diisi.");
      if (payload.fp_price <= 0) throw new Error("FP price wajib > 0.");
      if (payload.discount_value <= 0) throw new Error("Discount value wajib > 0.");
      if (isNew) return (await api.post("/admin/fp-shop/items", payload)).data.item;
      return (await api.put(`/admin/fp-shop/items/${id}`, payload)).data.item;
    },
    onSuccess: async (it) => {
      setError(null);
      if (imageFile && it?.id) {
        const fd = new FormData();
        fd.append("image", imageFile);
        await api.post(`/admin/fp-shop/items/${it.id}/image`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      navigate("/admin/fp-shop/items", { replace: true });
    },
    onError: (e) => setError(e?.response?.data?.message ?? e?.message ?? "Gagal"),
  });

  const del = useMutation({
    mutationFn: async () => api.delete(`/admin/fp-shop/items/${id}`),
    onSuccess: () => navigate("/admin/fp-shop/items", { replace: true }),
  });

  const deleteImage = useMutation({
    mutationFn: async () => api.delete(`/admin/fp-shop/items/${id}/image`),
    onSuccess: () => itemQuery.refetch(),
  });

  const imageUrl = useMemo(() => {
    const p = itemQuery.data?.image_path;
    if (!p) return null;
    return toPublicUrl(p);
  }, [itemQuery.data?.image_path]);

  return (
    <div className="mx-auto max-w-3xl pb-24 px-3">
      <div className="mb-6 flex items-end justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to="/admin/fp-shop/items"
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
                {isNew ? "New Coupon" : "Edit Coupon"}
              </h1>
            </div>
          </div>
        </div>

        {!isNew ? (
          <button
            type="button"
            onClick={() => del.mutate()}
            disabled={del.isPending}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/70 hover:bg-white/10 disabled:opacity-30"
          >
            <Trash2 size={16} /> Delete
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] font-semibold text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-5">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Name
              </label>
              <input
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                FP Price
              </label>
              <input
                type="number"
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={fpPrice}
                onChange={(e) => setFpPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Description
            </label>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Discount Type
              </label>
              <select
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="fixed">Fixed</option>
                <option value="percent">Percent</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Discount Value
              </label>
              <input
                type="number"
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Min Subtotal (Opt)
              </label>
              <input
                type="number"
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={minSubtotal}
                onChange={(e) => setMinSubtotal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Max Discount (Opt)
              </label>
              <input
                type="number"
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Starts At (Opt)
              </label>
              <input
                type="datetime-local"
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Ends At (Opt)
              </label>
              <input
                type="datetime-local"
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-white/70">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active
            </label>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                Sort
              </div>
              <input
                type="number"
                className="h-10 w-24 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-white outline-none focus:border-[var(--accent)]"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Image (Opt)
          </div>
          {imageUrl ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <img alt="" src={imageUrl} className="w-full max-h-80 object-cover" />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/70 hover:bg-white/10">
              <Upload size={16} />
              <span>{imageFile ? "Change file" : "Select file"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {imageFile ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/70 hover:bg-white/10"
                onClick={() => setImageFile(null)}
              >
                <X size={16} /> Clear
              </button>
            ) : null}
            {!isNew && itemQuery.data?.image_path ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-rose-200"
                onClick={() => deleteImage.mutate()}
                disabled={deleteImage.isPending}
              >
                <Trash2 size={16} /> Remove image
              </button>
            ) : null}
          </div>
        </section>

        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[var(--accent)] py-5 text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] shadow-xl shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
        >
          {save.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save size={16} /> Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}

