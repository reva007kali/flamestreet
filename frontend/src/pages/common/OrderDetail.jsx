import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import { useEcho } from "@/components/common/RealtimeProvider";
import { playNotifySound } from "@/lib/notifySound";
import { useAuthStore } from "@/store/authStore";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  Info,
  MapPin,
  Package,
  Receipt,
  RefreshCw,
} from "lucide-react";

function titleCase(s) {
  const v = String(s ?? "").trim();
  if (!v) return "-";
  return v
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function paymentVariant(paymentStatus) {
  if (paymentStatus === "paid") return "success";
  if (paymentStatus === "refunded") return "destructive";
  return "warning";
}

function statusVariant(status) {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "refunded") return "destructive";
  if (status === "delivering") return "warning";
  return "default";
}

function StatusBadge({ variant, children }) {
  const styles = {
    success: "bg-emerald-500/15 border-emerald-500/25 text-emerald-400",
    warning: "bg-orange-500/15 border-orange-500/25 text-orange-400",
    destructive: "bg-red-500/15 border-red-500/25 text-red-400",
    default: "bg-white/[0.07] border-white/10 text-white/50",
  };
  return (
    <span
      className={`rounded-full border px-2 py-[3px] text-[9px] font-black uppercase tracking-[0.06em] ${styles[variant] ?? styles.default}`}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, accent = false, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-[18px] border backdrop-blur-md ${
        accent
          ? "border-emerald-500/[0.12] bg-gradient-to-br from-[#061e12]/92 to-[#030c08]/96"
          : "border-white/[0.06] bg-gradient-to-br from-[#141418]/95 to-[#0a0a0c]/98"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({ icon: Icon, title, right, accent = true }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <div
          className={`grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-[8px] border ${
            accent
              ? "border-emerald-500/15 bg-emerald-500/10"
              : "border-white/[0.08] bg-white/[0.05]"
          }`}
        >
          <Icon
            size={13}
            className={accent ? "text-emerald-400/80" : "text-white/40"}
          />
        </div>
        <span className="text-[12px] font-black text-white">{title}</span>
      </div>
      {right}
    </div>
  );
}

const TIMELINE_STEPS = [
  { key: "pending", label: "Order Placed", sub: "Confirmed" },
  { key: "processing", label: "Processing", sub: "Being prepared" },
  { key: "delivering", label: "On Delivery", sub: "Out for delivery" },
  { key: "delivered", label: "Delivered", sub: "Completed" },
];

function OrderStatusTimeline({ status }) {
  const currentIdx = TIMELINE_STEPS.findIndex(
    (s) => s.key === status?.toLowerCase(),
  );

  return (
    <div className="flex flex-col">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        const isPending = i > currentIdx;
        const isLast = i === TIMELINE_STEPS.length - 1;

        return (
          <div key={step.key} className="flex gap-2.5">
            <div className="flex w-5 flex-shrink-0 flex-col items-center">
              <div
                className={`mt-[3px] h-2 w-2 flex-shrink-0 rounded-full transition-all ${
                  isDone
                    ? "bg-emerald-500"
                    : isActive
                      ? "animate-pulse bg-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-white/10"
                }`}
              />
              {!isLast && (
                <div
                  className={`my-[3px] w-px flex-1 ${
                    isDone ? "bg-emerald-500/30" : "bg-white/[0.07]"
                  }`}
                />
              )}
            </div>
            <div className="pb-3">
              <div
                className={`text-[11px] font-bold ${
                  isPending ? "text-white/30" : "text-white"
                }`}
              >
                {step.label}
              </div>
              {!isPending && (
                <div className="mt-0.5 text-[10px] text-white/30">
                  {step.sub}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetail() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const echo = useEcho();
  const qc = useQueryClient();
  const hasRole = useAuthStore((s) => s.hasRole);
  const previousStatusRef = useRef(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [dokuTx, setDokuTx] = useState(null);
  const [dokuUrl, setDokuUrl] = useState("");
  const [dokuError, setDokuError] = useState("");
  const [dokuLoading, setDokuLoading] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    if (hasRole("courier")) {
      navigate(`/courier/delivery/${orderNumber}`, { replace: true });
    }
  }, [hasRole, navigate, orderNumber]);

  const backPath = useMemo(() => {
    if (hasRole("cashier")) return "/cashier/orders";
    if (hasRole("admin")) return "/admin/orders";
    if (hasRole("courier")) return "/courier/dashboard";
    if (hasRole("trainer")) return "/trainer/orders";
    return "/member/orders";
  }, [hasRole]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(backPath);
  };

  const query = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: async () => (await api.get(`/orders/${orderNumber}`)).data.order,
    refetchInterval: 3000,
  });

  const methodsQuery = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => (await api.get("/payment-methods")).data.methods,
  });

  const order = query.data;
  const method = (methodsQuery.data ?? []).find(
    (m) => m.code === order?.payment_method,
  );
  const isDokuCheckout = Boolean(order?.payment_method?.startsWith?.("doku-"));
  const totalItems = useMemo(
    () =>
      (order?.items ?? []).reduce(
        (sum, it) => sum + (Number(it.quantity ?? 1) || 1),
        0,
      ),
    [order?.items],
  );
  const paymentLabel = useMemo(
    () => method?.name ?? titleCase(order?.payment_method),
    [method?.name, order?.payment_method],
  );

  useEffect(() => {
    if (!echo || !order?.id) return;
    const channel = echo.private(`order.${order.id}`);
    channel.listen(".OrderStatusUpdated", (e) => {
      qc.invalidateQueries({ queryKey: ["order", orderNumber] });
      if (e?.status || e?.paymentStatus) {
        qc.setQueryData(["order", orderNumber], (prev) =>
          prev
            ? {
                ...prev,
                status: e?.status ?? prev.status,
                payment_status: e?.paymentStatus ?? prev.payment_status,
              }
            : prev,
        );
        const message =
          e?.paymentStatus && !e?.status
            ? `Pembayaran diperbarui: ${e.paymentStatus}`
            : `Status order berubah ke ${e?.status ?? order?.status}`;
        setLiveMessage(message);
        playNotifySound(e?.paymentStatus === "paid" ? "success" : "status");
      }
    });
    channel.listen(".OrderChatMessageCreated", (e) => {
      if (!e?.id) return;
      qc.setQueryData(["orderChat", order.id], (prev) => {
        const list = Array.isArray(prev?.messages) ? prev.messages : [];
        const id = Number(e?.id);
        if (!id) return prev ?? { messages: list };
        if (list.some((m) => Number(m?.id) === id))
          return prev ?? { messages: list };
        return { messages: [...list, e] };
      });
    });
    return () => {
      echo.leave(`order.${order.id}`);
    };
  }, [echo, order?.id, orderNumber, qc]);

  useEffect(() => {
    if (!order) return;
    const current = `${order.status}|${order.payment_status}`;
    if (previousStatusRef.current && previousStatusRef.current !== current) {
      setLiveMessage(
        `Order diperbarui: ${order.status} • ${order.payment_status}`,
      );
      playNotifySound(order.payment_status === "paid" ? "success" : "status");
    }
    previousStatusRef.current = current;
  }, [order?.status, order?.payment_status, order]);

  useEffect(() => {
    if (!liveMessage) return;
    const timer = window.setTimeout(() => setLiveMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [liveMessage]);

  useEffect(() => {
    if (!order?.id || !isDokuCheckout) return;
    let cancelled = false;

    async function loadExisting() {
      const r = await api.get(`/orders/${order.id}/doku/checkout`);
      if (cancelled) return;
      setDokuTx(r.data.transaction ?? null);
      setDokuUrl(r.data.payment_url ?? "");
    }

    async function ensure() {
      setDokuError("");
      setDokuLoading(true);
      try {
        const r = await api.post(`/orders/${order.id}/doku/checkout`);
        if (cancelled) return;
        setDokuTx(r.data.transaction ?? null);
        setDokuUrl(r.data.payment_url ?? "");
      } catch {
        try {
          await loadExisting();
        } catch {
          if (!cancelled)
            setDokuError("Gagal membuat payment link. Coba lagi.");
        }
      } finally {
        if (!cancelled) setDokuLoading(false);
      }
    }

    if (order.payment_status === "unpaid") ensure();
    else loadExisting().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.payment_status, isDokuCheckout]);

  useEffect(() => {
    if (!order?.id || !isDokuCheckout) return;
    if (order.payment_status !== "unpaid") return;
    const timer = window.setInterval(async () => {
      try {
        const r = await api.get(`/orders/${order.id}/doku/checkout/status`);
        if (r.data?.transaction) setDokuTx(r.data.transaction);
        if (r.data?.payment_status === "paid") {
          qc.invalidateQueries({ queryKey: ["order", orderNumber] });
        }
      } catch {}
    }, 6000);
    return () => window.clearInterval(timer);
  }, [order?.id, order?.payment_status, isDokuCheckout, qc, orderNumber]);

  if (query.isLoading)
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#050a06" }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-900 border-t-emerald-400" />
      </div>
    );

  if (query.isError)
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4"
        style={{ background: "#050a06" }}
      >
        <div className="text-[13px] text-red-400">Failed to load order.</div>
        <button
          type="button"
          onClick={handleBack}
          className="rounded-[10px] border border-white/10 bg-white/[0.06] px-4 py-2 text-[12px] font-bold text-white"
        >
          Go Back
        </button>
      </div>
    );

  return (
    <div className="min-h-screen px-3 py-4" style={{ background: "#050a06" }}>
      <div className="mx-auto flex max-w-lg flex-col gap-2.5 pb-24">
        {/* top bar */}
        <div
          className="flex items-center justify-between gap-2 rounded-[18px] border border-emerald-500/10 px-3.5 py-2.5"
          style={{
            background:
              "linear-gradient(135deg, rgba(6,28,16,0.9) 0%, rgba(3,10,6,0.95) 100%)",
          }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={handleBack}
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.06]"
            >
              <ArrowLeft size={14} className="text-white" />
            </button>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">
                Order Detail
              </div>
              <div className="truncate text-[17px] font-black leading-tight text-white">
                #{order.order_number}
              </div>
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-1.5">
            <StatusBadge variant={paymentVariant(order.payment_status)}>
              {titleCase(order.payment_status)}
            </StatusBadge>
            <StatusBadge variant={statusVariant(order.status)}>
              {titleCase(order.status)}
            </StatusBadge>
          </div>
        </div>

        {/* live toast */}
        {liveMessage && (
          <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-zinc-950/90 px-4 py-2 text-[12px] font-semibold text-emerald-400 backdrop-blur">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {liveMessage}
            </div>
          </div>
        )}

        {/* track order */}
        <GlassCard accent>
          <CardHeader
            icon={Clock}
            title="Track Order"
            accent
            right={
              <span className="text-[10px] font-bold text-white/25">
                {totalItems} items
              </span>
            }
          />
          <div className="px-3.5 py-3">
            <OrderStatusTimeline status={order.status} />

            {order.payment_status === "unpaid" && method?.instructions && (
              <div className="mt-3 rounded-[12px] border border-blue-500/20 bg-blue-500/5 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-blue-300">
                  <Info size={12} /> Instructions
                </div>
                <div className="whitespace-pre-line text-[11px] leading-relaxed text-blue-100/70">
                  {method.instructions}
                </div>
              </div>
            )}

            {isDokuCheckout && order.payment_status === "unpaid" && (
              <div className="mt-3 rounded-[12px] border border-white/[0.07] bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[12px] font-bold text-white">
                      Pembayaran DOKU
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/35">
                      Total: Rp{" "}
                      {Number(order.total_amount ?? 0).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!order?.id) return;
                      setDokuError("");
                      setDokuLoading(true);
                      try {
                        const r = await api.post(
                          `/orders/${order.id}/doku/checkout`,
                        );
                        setDokuTx(r.data.transaction ?? null);
                        setDokuUrl(r.data.payment_url ?? "");
                      } catch {
                        setDokuError("Gagal membuat payment link. Coba lagi.");
                      } finally {
                        setDokuLoading(false);
                      }
                    }}
                    disabled={dokuLoading}
                    className="flex items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                  >
                    <RefreshCw size={11} />
                    Generate ulang
                  </button>
                </div>
                {dokuError && (
                  <div className="mt-2 text-[11px] text-red-400">
                    {dokuError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (dokuUrl) window.open(dokuUrl, "_blank");
                  }}
                  disabled={!dokuUrl || dokuLoading}
                  className="mt-3 w-full rounded-[12px] bg-emerald-500 py-2.5 text-[12px] font-black text-black disabled:opacity-40"
                >
                  Bayar sekarang
                </button>
                <div className="mt-2 text-[10px] text-white/25">
                  Status otomatis berubah setelah pembayaran berhasil.
                </div>
                {dokuTx?.reference_no && (
                  <div className="mt-2 rounded-[8px] border border-white/[0.07] bg-black/30 px-2.5 py-1.5 text-[10px] text-white/40">
                    Token: {dokuTx.reference_no}
                  </div>
                )}
              </div>
            )}
          </div>
        </GlassCard>

        {/* items */}
        <GlassCard>
          <CardHeader
            icon={Package}
            title="Items"
            accent={false}
            right={
              <span className="text-[10px] font-bold text-white/25">
                ({totalItems})
              </span>
            }
          />
          <div className="px-3.5 py-1">
            {(order.items ?? []).map((it) => (
              <div
                key={it.id}
                className="flex items-start justify-between gap-2 border-b border-white/[0.04] py-2.5 last:border-none last:pb-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-bold text-white">
                    {it.product_name}
                  </div>
                  <div className="mt-0.5 text-[10px] text-white/30">
                    Rp {Number(it.product_price ?? 0).toLocaleString("id-ID")} ×{" "}
                    {it.quantity}
                  </div>
                  {Array.isArray(it.modifier_options) &&
                    it.modifier_options.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {it.modifier_options.map((m, idx) => (
                          <span
                            key={idx}
                            className="rounded-[5px] border border-white/[0.07] bg-white/[0.05] px-1.5 py-[2px] text-[9px] text-white/35"
                          >
                            {m.option_name}
                          </span>
                        ))}
                      </div>
                    )}
                  {it.item_notes && (
                    <div className="mt-1.5 text-[10px] italic text-white/30">
                      "{it.item_notes}"
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-[12px] font-black text-white">
                  Rp {Number(it.subtotal ?? 0).toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* order summary */}
        <GlassCard accent>
          <CardHeader icon={Receipt} title="Order Summary" accent />
          <div className="space-y-1 px-3.5 py-3">
            {order.gym && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/35">Gym Location</span>
                <span className="truncate text-right text-[11px] font-bold text-white">
                  {order.gym.gym_name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/35">Subtotal</span>
              <span className="text-[11px] font-bold text-white/70">
                Rp {Number(order.subtotal ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/35">Delivery Fee</span>
              <span className="text-[11px] font-bold text-white/70">
                Rp {Number(order.delivery_fee ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/35">Discount</span>
              <span className="text-[11px] font-bold text-emerald-400">
                -Rp {Number(order.discount_amount ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="my-2 h-px bg-white/[0.06]" />
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black text-white">Total</span>
              <span className="text-[14px] font-black text-white">
                Rp {Number(order.total_amount ?? 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* delivery */}
        <GlassCard>
          <CardHeader icon={MapPin} title="Delivery" accent={false} />
          <div className="space-y-3 px-3.5 py-3">
            <div>
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/25">
                Recipient
              </div>
              <div className="text-[11px] font-bold text-white">
                {order.recipient_name}
              </div>
              <div className="text-[10px] text-white/35">
                {order.recipient_phone}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/25">
                Address
              </div>
              <div className="whitespace-pre-line text-[11px] font-semibold text-white/80">
                {order.delivery_address}
              </div>
              {order.delivery_notes && (
                <div className="mt-2 rounded-[8px] border border-white/[0.07] bg-white/[0.04] px-2.5 py-2 text-[10px] text-white/35">
                  Note: {order.delivery_notes}
                </div>
              )}
            </div>
            {(hasRole("member") || hasRole("trainer")) && order.courier_id ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `${hasRole("trainer") ? "/trainer" : "/member"}/chats/${order.order_number}`,
                  )
                }
                className="w-full rounded-[14px] bg-emerald-500 py-2.5 text-[12px] font-black text-black"
              >
                Buka Chat Courier
              </button>
            ) : null}
          </div>
        </GlassCard>

        {/* payment */}
        <GlassCard>
          <CardHeader
            icon={CreditCard}
            title="Payment"
            accent={false}
            right={
              <StatusBadge variant={paymentVariant(order.payment_status)}>
                {titleCase(order.payment_status)}
              </StatusBadge>
            }
          />
          <div className="px-3.5 py-3">
            <div className="text-[12px] font-bold text-white">
              {paymentLabel}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
