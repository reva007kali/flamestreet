import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useCartStore } from "@/store/cartStore";
import { toPublicUrl } from "@/lib/assets";
import {
  CheckCircle2,
  Loader2,
  Search,
  Truck,
  User as UserIcon,
  X,
} from "lucide-react";

function formatGymAddress(g) {
  return [g?.gym_name, g?.address, g?.city, g?.province]
    .filter(Boolean)
    .join(", ");
}

function gymImageUrl(path) {
  if (!path) return null;
  const p = String(path).trim().replace(/^\/+/, "");
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("uploads/") || p.startsWith("storage/"))
    return toPublicUrl(p);
  return toPublicUrl(`storage/${p}`);
}

export default function CheckoutPOS() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore((s) => s.total);

  const [memberQuery, setMemberQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const [gymPickerOpen, setGymPickerOpen] = useState(false);
  const [gymSearch, setGymSearch] = useState("");
  const [gymId, setGymId] = useState("");
  const [gymAutoPickEnabled, setGymAutoPickEnabled] = useState(true);

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("doku-qris");

  const usersQuery = useQuery({
    queryKey: ["staff", "users", "search", memberQuery],
    enabled: memberQuery.trim().length >= 2,
    queryFn: async () =>
      (
        await api.get("/staff/users/search", {
          params: { q: memberQuery.trim() },
        })
      ).data?.users ?? [],
    staleTime: 5_000,
  });

  const gymsQuery = useQuery({
    queryKey: ["gyms"],
    queryFn: async () => (await api.get("/gyms")).data?.gyms ?? [],
    staleTime: 30_000,
  });

  const filteredGyms = useMemo(() => {
    const q = String(gymSearch ?? "")
      .trim()
      .toLowerCase();
    const list = gymsQuery.data ?? [];
    if (!q) return list;
    return list.filter((g) => {
      const a = String(g?.gym_name ?? "").toLowerCase();
      const b = String(g?.address ?? "").toLowerCase();
      const c = String(g?.city ?? "").toLowerCase();
      const d = String(g?.province ?? "").toLowerCase();
      return a.includes(q) || b.includes(q) || c.includes(q) || d.includes(q);
    });
  }, [gymsQuery.data, gymSearch]);

  const selectedGym = useMemo(() => {
    const id = Number(gymId);
    if (!id) return null;
    return (gymsQuery.data ?? []).find((g) => Number(g.id) === id) ?? null;
  }, [gymId, gymsQuery.data]);

  useEffect(() => {
    if (!selectedUser) return;
    setRecipientName(selectedUser.full_name ?? "");
    setRecipientPhone(selectedUser.phone_number ?? "");
    const def = selectedUser.member_profile?.default_gym_id;
    if (def && !gymId && gymAutoPickEnabled) setGymId(String(def));
  }, [selectedUser?.id, gymId, gymAutoPickEnabled]);

  useEffect(() => {
    if (!selectedGym) return;
    setDeliveryAddress(formatGymAddress(selectedGym));
  }, [selectedGym?.id]);

  const clearGymCoverage = () => {
    setGymAutoPickEnabled(false);
    setGymId("");
    setGymSearch("");
    if (selectedGym) {
      const auto = formatGymAddress(selectedGym);
      if (String(deliveryAddress ?? "").trim() === String(auto ?? "").trim()) {
        setDeliveryAddress("");
      }
    }
  };

  const createPosOrder = useMutation({
    mutationFn: async () => {
      if (!selectedUser?.id) throw new Error("Pilih member dulu.");
      if (!gymId) throw new Error("Pilih gym coverage dulu.");
      if (!String(deliveryAddress ?? "").trim())
        throw new Error("Alamat pengantaran wajib diisi.");
      if (!items.length) throw new Error("Cart masih kosong.");

      const payload = {
        user_id: Number(selectedUser.id),
        gym_id: Number(gymId),
        delivery_address: String(deliveryAddress).trim(),
        delivery_notes: deliveryNotes || null,
        recipient_name: String(recipientName ?? "").trim(),
        recipient_phone: String(recipientPhone ?? "").trim(),
        payment_method: paymentMethod || null,
        items: items.map((it) => ({
          product_id: it.product.id,
          quantity: Number(it.quantity ?? 1),
          modifier_option_ids: it.modifierOptionIds ?? [],
          item_notes: it.itemNotes || null,
        })),
      };

      const order = (await api.post("/staff/pos/orders", payload)).data?.order;
      if (!order?.id) throw new Error("Gagal membuat order.");

      let paymentUrl = "";
      if (String(paymentMethod ?? "").startsWith("doku")) {
        try {
          const pr = await api.post(`/staff/orders/${order.id}/doku/checkout`);
          paymentUrl = pr.data?.payment_url ? String(pr.data.payment_url) : "";
        } catch {}
      }

      return { order, paymentUrl };
    },
    onSuccess: ({ order }) => {
      clearCart();
      navigate(`/orders/${order.order_number}`);
    },
  });

  return (
    <div className="mx-auto max-w-2xl pb-32 px-3">
      <div className="mb-8 flex items-end justify-between px-1">
        <div>
          <h1 className="text-lg font-bold italic tracking-tight text-white uppercase flex items-center gap-2">
            <Truck className="text-[var(--accent)]" size={22} />
            Cashier Checkout (POS)
          </h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
            {items.length} items • Rp{" "}
            {Number(subtotal()).toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Customer
            </div>
            {selectedUser ? (
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                Selected
              </div>
            ) : null}
          </div>

          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 pl-11 pr-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)] transition-all placeholder:text-zinc-600"
              placeholder="Cari member / trainer (nama / WA / username)…"
              value={memberQuery}
              onChange={(e) => {
                setMemberQuery(e.target.value);
                setSelectedUser(null);
                setGymAutoPickEnabled(true);
              }}
            />
          </div>

          {memberQuery.trim().length >= 2 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              {usersQuery.isLoading ? (
                <div className="px-4 py-3 text-sm font-semibold text-zinc-400">
                  <Loader2 size={14} className="inline mr-2 animate-spin" />
                  Searching…
                </div>
              ) : (usersQuery.data ?? []).length ? (
                <div className="max-h-64 overflow-y-auto">
                  {(usersQuery.data ?? []).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 last:border-b-0"
                      onClick={() => {
                        setSelectedUser(u);
                        setMemberQuery(u.full_name ?? "");
                        setGymAutoPickEnabled(true);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-black text-white">
                            {u.full_name ?? "User"}
                          </div>
                          <div className="mt-0.5 text-[11px] font-semibold text-white/50">
                            {u.phone_number ?? "-"} •{" "}
                            {(u.roles ?? []).join(", ")}
                          </div>
                        </div>
                        <UserIcon size={14} className="text-white/35" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm font-semibold text-zinc-400">
                  Tidak ada hasil.
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Delivery
          </div>

          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setGymPickerOpen(true)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-left transition-all ${gymId ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-white/35">
                    Gym Coverage
                  </div>
                  <div className="truncate text-[13px] font-black text-white">
                    {selectedGym?.gym_name ?? "Pilih Gym"}
                  </div>
                </div>
                {gymId ? (
                  <CheckCircle2 size={16} className="text-[var(--accent)]" />
                ) : null}
              </div>
            </button>
            {gymId ? (
              <button
                type="button"
                onClick={clearGymCoverage}
                className="h-[46px] w-[46px] shrink-0 rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 active:scale-[0.98]"
                aria-label="Remove gym coverage"
                title="Remove gym coverage"
              >
                <X size={16} className="mx-auto" />
              </button>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Alamat
            </label>
            <textarea
              className="min-h-24 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)] transition-all"
              placeholder="Non gym coverage, alamatnya di isi di sini ya sayang"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Recipient Name
              </label>
              <input
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)] transition-all"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                Phone
              </label>
              <input
                className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)] transition-all"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Notes
            </label>
            <textarea
              className="min-h-16 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)] transition-all"
              placeholder="Catatan kurir"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Payment
            </label>
            <select
              className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)] transition-all"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="doku-qris">DOKU QRIS</option>
              <option value="doku-va">DOKU VA</option>
              <option value="doku-cc">DOKU CC</option>
            </select>
          </div>

          <button
            type="button"
            className="mt-2 w-full flex items-center justify-center gap-3 rounded-2xl bg-[var(--accent)] py-5 text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] shadow-xl shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
            onClick={() => createPosOrder.mutate()}
            disabled={createPosOrder.isPending || !items.length}
          >
            {createPosOrder.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Placing order…
              </>
            ) : (
              "Place Order"
            )}
          </button>

          {createPosOrder.isError ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[11px] font-semibold text-rose-200">
              {createPosOrder.error?.message ?? "Gagal"}
            </div>
          ) : null}
        </section>
      </div>

      {gymPickerOpen ? (
        <div className="fixed inset-0 z-[3000] bg-black/70 backdrop-blur-sm">
          <div className="h-full w-full overflow-hidden bg-zinc-950">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur">
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                  Gym Coverage
                </div>
                <div className="truncate text-[14px] font-black text-white">
                  Pilih Gym
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGymPickerOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black text-white"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <div className="relative">
                <input
                  className="h-11 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-white outline-none focus:border-[var(--accent)] transition-all placeholder:text-zinc-600"
                  placeholder="Cari gym / alamat / kota…"
                  value={gymSearch}
                  onChange={(e) => setGymSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="h-[calc(100vh-110px)] overflow-y-auto p-4 pt-0">
              {gymsQuery.isLoading ? (
                <div className="px-2 py-6 text-center text-sm font-semibold text-zinc-400">
                  Loading gyms…
                </div>
              ) : filteredGyms.length ? (
                <div className="space-y-2">
                  {filteredGyms.map((g) => {
                    const active = String(gymId) === String(g.id);
                    const img = gymImageUrl(g.image);
                    const addr = formatGymAddress(g);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        className={`w-full rounded-2xl border p-3 text-left transition-all ${active ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                        onClick={() => {
                          setGymId(String(g.id));
                          setGymPickerOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                            {img ? (
                              <img
                                alt=""
                                src={img}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.src = "/flame-icon.png";
                                }}
                              />
                            ) : (
                              <img
                                alt=""
                                src="/flame-icon.png"
                                className="h-full w-full object-contain p-3 opacity-30"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-black text-white">
                              {g.gym_name}
                            </div>
                            <div className="mt-1 line-clamp-2 text-[11px] font-semibold text-white/50">
                              {addr}
                            </div>
                          </div>
                          {active ? (
                            <CheckCircle2
                              size={16}
                              className="shrink-0 text-[var(--accent)]"
                            />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-2 py-6 text-center text-sm font-semibold text-zinc-400">
                  Tidak ada gym.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
