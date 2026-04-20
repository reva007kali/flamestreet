import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { toPublicUrl } from "@/lib/assets";
import {
  MapPin,
  Truck,
  CreditCard,
  User as UserIcon,
  Phone,
  FileText,
  Wallet,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

const WA_PHONE = "6285182841385";

function formatGymAddress(g) {
  const parts = [g?.gym_name, g?.address, g?.city, g?.province].filter(Boolean);
  return parts.join(", ");
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

function selectedChoices(item) {
  const selected = new Set(item?.modifierOptionIds ?? []);
  const mods = item?.product?.modifiers ?? [];
  const rows = [];
  for (const m of mods) {
    const picked = (m.options ?? [])
      .filter((o) => selected.has(o.id))
      .map((o) => o.name);
    if (picked.length) rows.push(picked.join(", "));
  }
  return rows;
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const subtotal = useCartStore((s) => s.total);

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [recipientName, setRecipientName] = useState(user?.full_name ?? "");
  const [recipientPhone, setRecipientPhone] = useState(
    user?.phone_number ?? "",
  );
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [gymId, setGymId] = useState("");
  const [deliveryLat, setDeliveryLat] = useState(null);
  const [deliveryLng, setDeliveryLng] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [didInitGymId, setDidInitGymId] = useState(false);
  const [mapFocusSignal, setMapFocusSignal] = useState(0);
  const [autoAddress, setAutoAddress] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locAccuracyM, setLocAccuracyM] = useState(null);
  const [locWarning, setLocWarning] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [historyPickId, setHistoryPickId] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [debouncedAddressQuery, setDebouncedAddressQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [gymPickerOpen, setGymPickerOpen] = useState(false);
  const [gymSearch, setGymSearch] = useState("");
  const customMapEnabled = false;

  const openGojek = () => {
    window.open(
      "https://gofood.link/a/LY83SJu",
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openWhatsApp = (text) => {
    const url = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(String(text ?? ""))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const historyKey = useMemo(() => {
    const id = user?.id != null ? String(user.id) : "me";
    return `flamestreet_checkout_history_${id}`;
  }, [user?.id]);

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(historyKey);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x) => x && typeof x === "object" && typeof x.id === "string")
        .slice(0, 5);
    } catch {
      return [];
    }
  };

  const saveHistory = (rows) => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(rows.slice(0, 5)));
    } catch {}
  };

  useEffect(() => {
    setLocationHistory(loadHistory());
    setHistoryPickId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyKey]);

  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => (await api.get("/payment-methods")).data.methods,
  });

  const isTrainerCheckout = location.pathname.startsWith("/trainer");

  const pointsQuery = useQuery({
    queryKey: ["checkout", "points", isTrainerCheckout ? "trainer" : "member"],
    queryFn: async () => {
      if (isTrainerCheckout) return (await api.get("/trainer/points")).data;
      return (await api.get("/member/points")).data;
    },
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

  useEffect(() => {
    if (didInitGymId) return;
    if (gymId) {
      setDidInitGymId(true);
      return;
    }

    try {
      const stored = localStorage.getItem("flamestreet_default_gym_id");
      if (stored && String(stored).trim()) {
        setGymId(String(stored).trim());
        setDidInitGymId(true);
        return;
      }
    } catch {}

    if (!meQuery.data) return;
    const def = meQuery.data?.member_profile?.default_gym_id;
    if (def) {
      setGymId(String(def));
      setDidInitGymId(true);
      return;
    }

    setDidInitGymId(true);
  }, [meQuery.data, gymId, didInitGymId]);

  const selectedGym = useMemo(() => {
    const id = Number(gymId);
    if (!id) return null;
    return (gymsQuery.data ?? []).find((g) => Number(g.id) === id) ?? null;
  }, [gymId, gymsQuery.data]);

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

  useEffect(() => {
    if (selectedGym) {
      setDeliveryAddress(formatGymAddress(selectedGym));
      setDeliveryFee(0);
      setDeliveryLat(null);
      setDeliveryLng(null);
      setAutoAddress(true);
    }
  }, [selectedGym?.id]);

  const reverseGeocode = async (lat, lng) => {
    const r = await api.get("/delivery/reverse-geocode", {
      params: { lat, lng },
    });
    const label = r.data?.result?.label ?? "";
    return String(label || "").trim();
  };

  const pickAccurateLocation = async () => {
    if (!navigator.geolocation) {
      throw new Error("Geolocation not supported");
    }

    setLocLoading(true);
    setLocWarning(null);

    const opts = { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 };

    const getOnce = () =>
      new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      });

    let best = null;

    try {
      const first = await getOnce();
      best = first;
    } catch {}

    const watch = await new Promise((resolve) => {
      let watchId = null;
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (!pos?.coords) return;
            if (!best) {
              best = pos;
              return;
            }
            const a = Number(pos.coords.accuracy ?? Infinity);
            const b = Number(best.coords?.accuracy ?? Infinity);
            if (a < b) best = pos;
          },
          () => {},
          opts,
        );
      } catch {}
      const stop = () => {
        if (watchId != null) {
          try {
            navigator.geolocation.clearWatch(watchId);
          } catch {}
        }
        resolve(true);
      };
      window.setTimeout(stop, 2500);
    });

    void watch;

    if (!best?.coords) {
      setLocLoading(false);
      throw new Error("Failed to get location");
    }

    const lat = Number(best.coords.latitude);
    const lng = Number(best.coords.longitude);
    const acc = Number(best.coords.accuracy ?? NaN);

    setLocLoading(false);
    setLocAccuracyM(Number.isFinite(acc) ? acc : null);
    if (Number.isFinite(acc) && acc > 80) {
      setLocWarning(
        `Akurasi lokasi masih rendah (±${Math.round(acc)}m). Geser pin di peta untuk lebih akurat.`,
      );
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Invalid location");
    }

    return { lat, lng, accuracy: Number.isFinite(acc) ? acc : null };
  };

  const quoteQuery = useQuery({
    queryKey: ["delivery", "quote", { lat: deliveryLat, lng: deliveryLng }],
    enabled:
      customMapEnabled && !gymId && deliveryLat != null && deliveryLng != null,
    queryFn: async () =>
      (
        await api.get("/delivery/quote", {
          params: { lat: deliveryLat, lng: deliveryLng },
        })
      ).data.quote,
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!customMapEnabled) return;
    if (gymId) return;
    const q = quoteQuery.data ?? null;
    if (!q) return;
    setDeliveryFee(Number(q.fee ?? 0) || 0);
  }, [customMapEnabled, gymId, quoteQuery.data]);

  useEffect(() => {
    if (!customMapEnabled) return;
    if (gymId) return;
    if (deliveryLat == null || deliveryLng == null) return;
    if (!autoAddress && String(deliveryAddress ?? "").trim()) return;

    const lat = Number(deliveryLat);
    const lng = Number(deliveryLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const t = window.setTimeout(() => {
      reverseGeocode(lat, lng)
        .then((label) => {
          if (!label) return;
          setDeliveryAddress(label);
          setAutoAddress(true);
        })
        .catch(() => {});
    }, 450);

    return () => window.clearTimeout(t);
  }, [
    customMapEnabled,
    gymId,
    deliveryLat,
    deliveryLng,
    autoAddress,
    deliveryAddress,
  ]);

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedAddressQuery(String(addressQuery ?? "").trim()),
      250,
    );
    return () => window.clearTimeout(t);
  }, [addressQuery]);

  const addressSuggestQuery = useQuery({
    queryKey: ["delivery", "geocodeSearch", debouncedAddressQuery],
    enabled: customMapEnabled && !gymId && debouncedAddressQuery.length >= 3,
    queryFn: async () =>
      (
        await api.get("/delivery/geocode-search", {
          params: { q: debouncedAddressQuery },
        })
      ).data.results,
    staleTime: 30_000,
  });

  const suggestions = useMemo(
    () => (addressSuggestQuery.data ?? []).slice(0, 5),
    [addressSuggestQuery.data],
  );

  const payload = useMemo(
    () => ({
      gym_id: gymId ? Number(gymId) : null,
      delivery_address: deliveryAddress,
      delivery_lat: null,
      delivery_lng: null,
      delivery_notes: deliveryNotes || null,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      payment_method: paymentMethod || null,
      delivery_fee: 0,
      discount_amount: 0,
      items: items.map((it) => ({
        product_id: it.product.id,
        quantity: it.quantity ?? 1,
        modifier_option_ids: it.modifierOptionIds ?? [],
        item_notes: it.itemNotes ?? null,
      })),
    }),
    [
      gymId,
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      deliveryNotes,
      recipientName,
      recipientPhone,
      paymentMethod,
      deliveryFee,
      items,
    ],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!gymId) {
        throw new Error(
          "Custom address sementara nonaktif. Pilih Gym Coverage atau Order via Gojek.",
        );
      }
      return (await api.post("/orders", payload)).data.order;
    },
    onSuccess: async (order) => {
      try {
        const now = Date.now();
        const existing = loadHistory();
        let entry = null;
        if (gymId) {
          const g = selectedGym;
          entry = {
            id: `gym:${String(gymId)}`,
            kind: "gym",
            gym_id: String(gymId),
            label: g?.gym_name
              ? `Gym: ${String(g.gym_name)}`
              : `Gym #${String(gymId)}`,
            created_at: now,
          };
        }
        if (entry) {
          const next = [entry]
            .concat(existing.filter((x) => x?.id !== entry.id))
            .slice(0, 5);
          saveHistory(next);
          setLocationHistory(next);
        }
      } catch {}

      clearCart();
      if (paymentMethod && paymentMethod.startsWith("doku-")) {
        try {
          const r = await api.post(`/orders/${order.id}/doku/checkout`);
          const url = r.data?.payment_url;
          if (url) {
            window.location.href = url;
            return;
          }
        } catch {}
      }
      navigate(`/orders/${order.order_number}`);
    },
    onError: (e) => {
      setError(e?.response?.data?.message ?? "Checkout failed");
    },
  });

  const waMutation = useMutation({
    mutationFn: async () => {
      if (!gymId) {
        throw new Error("Pilih Gym Coverage dulu untuk order via WhatsApp.");
      }
      const addr = String(deliveryAddress ?? "").trim();
      if (!addr) throw new Error("Alamat pengantaran wajib diisi.");
      if (!items.length) throw new Error("Cart masih kosong.");

      const waPayload = {
        ...payload,
        gym_id: Number(gymId),
        delivery_address: addr,
        delivery_lat: null,
        delivery_lng: null,
        delivery_fee: 0,
        payment_method: paymentMethod || null,
      };

      const order = (await api.post("/orders", waPayload)).data.order;
      if (!order?.id) throw new Error("Gagal membuat order.");
      let paymentUrl = "";
      if (String(paymentMethod ?? "").startsWith("doku-")) {
        try {
          const pr = await api.post(`/orders/${order.id}/doku/checkout`);
          paymentUrl = pr.data?.payment_url ? String(pr.data.payment_url) : "";
        } catch {}
      }
      return { order, paymentUrl };
    },
    onSuccess: ({ order, paymentUrl }) => {
      clearCart();
      const roleLabel = isTrainerCheckout ? "Trainer" : "Member";
      const lines = [];
      lines.push("Halo Flamestreet, saya mau order via WhatsApp.");
      lines.push("");
      lines.push(`Nama: ${user?.full_name ?? recipientName ?? "-"}`);
      lines.push(`Role: ${roleLabel}`);
      lines.push(`Alamat Pengantaran: ${String(deliveryAddress ?? "").trim()}`);
      lines.push("");
      lines.push("Items:");
      items.forEach((it, idx) => {
        const qty = Number(it.quantity ?? 1);
        const price = Number(it.product?.price ?? 0) * qty;
        lines.push(
          `${idx + 1}) ${it.product?.name} x${qty} - Rp ${price.toLocaleString("id-ID")}`,
        );
        const mods = selectedChoices(it);
        if (mods.length) lines.push(`   • ${mods.join(" • ")}`);
      });
      lines.push("");
      lines.push(`Subtotal: Rp ${Number(subtotal()).toLocaleString("id-ID")}`);
      lines.push(`Total: Rp ${Number(subtotal()).toLocaleString("id-ID")}`);
      lines.push("");
      lines.push(`Order Number: #${order?.order_number ?? ""}`);
      if (paymentUrl) lines.push(`Payment (DOKU): ${paymentUrl}`);
      openWhatsApp(lines.join("\n"));
      navigate(`/orders/${order.order_number}`);
    },
    onError: (e) => {
      setError(
        e?.response?.data?.message ?? e?.message ?? "WhatsApp order failed",
      );
    },
  });
  // ini variable untuk data dan balance , cek kembali apakah sudah benar
  const pointsBalance = Number(pointsQuery.data?.balance ?? 0) || 0;
  const pointsDue = Math.round(Number(subtotal()) || 0);
  const pointsOk =
    paymentMethod !== "flame-points" || pointsBalance >= pointsDue;
  const needPaidDeliveryLocation = !gymId;
  const grandTotal = Number(subtotal()) || 0;

  useEffect(() => {
    if (!suggestOpen) return;
    const onDown = (e) => {
      const t = e.target;
      if (
        t &&
        typeof t.closest === "function" &&
        t.closest("[data-addr-suggest-wrap]")
      )
        return;
      setSuggestOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [suggestOpen]);

  const applyHistoryItem = (id) => {
    if (!id) return;
    const it = (locationHistory ?? []).find((x) => x?.id === id);
    if (!it) return;
    setHistoryPickId(id);
    setDidInitGymId(true);

    if (it.kind === "gym" && it.gym_id) {
      setGymId(String(it.gym_id));
      setDeliveryFee(0);
      return;
    }

    if (it.kind === "custom" && it.lat != null && it.lng != null) {
      openGojek();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black italic tracking-tight text-white uppercase flex items-center gap-2">
          <Sparkles
            className="text-[var(--accent)]"
            size={24}
            fill="currentColor"
          />
          Checkout
        </h1>
        <p className="text-sm text-zinc-500 font-medium">
          Selesaikan pesanan asupan proteinmu hari ini.
        </p>
      </div>

      <div className="grid w-full min-w-0 gap-8 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: FORMS */}
        <div className="min-w-0 lg:col-span-7 space-y-6">
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
                            onClick={async () => {
                              const id = String(g.id);
                              setDidInitGymId(true);
                              setGymId(id);
                              setGymPickerOpen(false);
                              try {
                                localStorage.setItem(
                                  "flamestreet_default_gym_id",
                                  id,
                                );
                              } catch {}
                              if (!isTrainerCheckout) {
                                try {
                                  await api.put("/me/member-profile", {
                                    default_gym_id: Number(g.id),
                                  });
                                } catch {}
                              }
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

          {/* Delivery Section */}
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-900">
              <Truck size={18} className="text-[var(--accent)]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                Delivery Details
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Destination
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDidInitGymId(true);
                      openGojek();
                    }}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-center text-zinc-500 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    <MapPin size={16} className="mx-auto mb-1" />
                    <span className="text-[11px] font-bold uppercase">
                      Order via Gojek
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGymPickerOpen(true)}
                    className={`rounded-xl border p-3 text-center transition-all ${gymId ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]" : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}
                  >
                    <Truck size={16} className="mx-auto mb-1" />
                    <span className="text-[11px] font-bold uppercase">
                      {gymId
                        ? (selectedGym?.gym_name ?? "Gym Coverage")
                        : "Gym Coverage"}
                    </span>
                  </button>
                </div>

                {locationHistory.length ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        Recent
                      </div>
                      <div className="truncate text-[11px] font-semibold text-zinc-300">
                        Pilih lokasi terakhir (max 5)
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <select
                        className="h-9 w-44 max-w-[45vw] appearance-none rounded-xl border border-white/10 bg-zinc-950/60 pl-3 pr-8 text-[11px] font-bold text-white/70 outline-none transition focus:border-[var(--accent)]"
                        value={historyPickId}
                        onChange={(e) => applyHistoryItem(e.target.value)}
                      >
                        <option value="" className="bg-zinc-900 text-white">
                          Select
                        </option>
                        {locationHistory.map((h) => (
                          <option
                            key={h.id}
                            value={h.id}
                            className="bg-zinc-900 text-white"
                          >
                            {String(h.label ?? h.id)}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-white/35" />
                    </div>
                  </div>
                ) : null}
              </div>

              {selectedGym && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-[11px] font-bold text-emerald-500 uppercase tracking-widest">
                  <Sparkles size={14} /> Free delivery to {selectedGym.gym_name}{" "}
                  coverage
                </div>
              )}

              {!gymId ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-4">
                    <div className="text-[12px] font-black text-white">
                      Custom Address (sementara nonaktif)
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-zinc-400">
                      Untuk alamat di luar gym coverage, silakan order via
                      Gojek.
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={openGojek}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white"
                      >
                        Order via Gojek
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDidInitGymId(true);
                          setGymPickerOpen(true);
                        }}
                        className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-[var(--accent)]"
                      >
                        Pilih Gym
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Full Address
                  </label>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)] transition-all disabled:opacity-50"
                    placeholder={
                      gymId
                        ? "Street name, building, unit number..."
                        : "Custom address sementara nonaktif. Gunakan Gym Coverage atau Order via Gojek."
                    }
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      setAutoAddress(false);
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Recipient
                    </label>
                    <div className="relative">
                      <UserIcon
                        size={14}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                      />
                      <input
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone
                        size={14}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                      />
                      <input
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Delivery Notes
                  </label>
                  <div className="relative">
                    <FileText
                      size={14}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
                      placeholder="e.g. Rumah No 11, Gedung A LT 1, Kantor A"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Section */}
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-900">
              <CreditCard size={18} className="text-[var(--accent)]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                Payment Method
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(methodsQuery.data ?? []).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.code)}
                  className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${paymentMethod === m.code ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-lg shadow-[var(--accent)]/5" : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${paymentMethod === m.code ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-zinc-800 text-zinc-500"}`}
                    >
                      {m.code === "flame-points" ? (
                        <Wallet size={16} />
                      ) : (
                        <CreditCard size={16} />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-black uppercase tracking-tight ${paymentMethod === m.code ? "text-white" : "text-zinc-500"}`}
                    >
                      {m.name}
                    </span>
                  </div>
                  {paymentMethod === m.code && (
                    <CheckCircle2 size={16} className="text-[var(--accent)]" />
                  )}
                </button>
              ))}
            </div>

            {paymentMethod === "flame-points" && (
              <div className="rounded-2xl bg-[var(--accent)]/5 border border-[var(--accent)]/20 p-5 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Poin Saldo</span>
                  <span className="text-white">
                    {pointsBalance.toLocaleString("id-ID")} Pts
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Bill Total</span>
                  <span className="text-[var(--accent)] font-black">
                    {pointsDue.toLocaleString("id-ID")} Pts
                  </span>
                </div>
                {!pointsOk && (
                  <div className="flex items-center gap-2 mt-2 pt-3 border-t border-[var(--accent)]/10 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                    <AlertCircle size={14} /> Saldo tidak cukup
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="min-w-0 lg:col-span-5 lg:sticky lg:top-24">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-[0.02] blur-3xl rounded-full" />

            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
                      <span className="text-[var(--accent)] text-[10px]">
                        x{it.quantity ?? 1}
                      </span>
                      {it.product?.name}
                    </div>
                    {selectedChoices(it).length > 0 && (
                      <div className="text-[10px] text-zinc-500 mt-1 font-medium italic">
                        {selectedChoices(it).join(" • ")}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-[11px] font-bold text-zinc-400 tabular-nums">
                    Rp{" "}
                    {(
                      Number(it.product?.price ?? 0) * (it.quantity ?? 1)
                    ).toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3 border-t border-zinc-900 pt-6">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                <span>Subtotal</span>
                <span className="text-zinc-200">
                  Rp {Number(subtotal()).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                <span>Delivery Fee</span>
                <span
                  className={
                    gymId ? "text-emerald-500 italic" : "text-zinc-200"
                  }
                >
                  {gymId
                    ? "Free"
                    : `Rp ${Number(deliveryFee || 0).toLocaleString("id-ID")}`}
                </span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-sm font-black text-white uppercase tracking-widest">
                  Grand Total
                </span>
                <span className="text-2xl font-black text-[var(--accent)] tabular-nums tracking-tighter">
                  Rp {Number(grandTotal).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              type="button"
              className="mt-8 w-full group flex items-center justify-center gap-3 rounded-2xl bg-[var(--accent)] py-5 text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] shadow-xl shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
              onClick={() => {
                setError(null);
                mutation.mutate();
              }}
              disabled={
                !items.length ||
                !paymentMethod ||
                !deliveryAddress ||
                mutation.isPending ||
                waMutation.isPending ||
                !pointsOk ||
                needPaidDeliveryLocation ||
                (!gymId && quoteQuery.isLoading)
              }
            >
              {mutation.isPending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Place Order{" "}
                  <ChevronRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>

            <button
              type="button"
              className="mt-3 w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-zinc-900 disabled:opacity-30 disabled:grayscale"
              onClick={() => {
                setError(null);
                waMutation.mutate();
              }}
              disabled={
                !items.length ||
                !deliveryAddress ||
                waMutation.isPending ||
                mutation.isPending ||
                needPaidDeliveryLocation
              }
            >
              <span className="text-[#25D366]">WhatsApp</span> Order + Payment
              Link
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
