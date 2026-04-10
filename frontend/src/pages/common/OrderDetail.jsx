import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import { useEcho } from "@/components/common/RealtimeProvider";
import OrderStatusTimeline from "@/components/order/OrderStatusTimeline";
import { playNotifySound } from "@/lib/notifySound";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
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
      }
      if (e?.status || e?.paymentStatus) {
        const message =
          e?.paymentStatus && !e?.status
            ? `Pembayaran diperbarui: ${e.paymentStatus}`
            : `Status order berubah ke ${e?.status ?? order?.status}`;
        setLiveMessage(message);
        playNotifySound(e?.paymentStatus === "paid" ? "success" : "status");
      }
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
      } catch (e) {
        try {
          await loadExisting();
        } catch {
          if (!cancelled) setDokuError("Gagal membuat payment link. Coba lagi.");
        }
      } finally {
        if (!cancelled) setDokuLoading(false);
      }
    }

    if (order.payment_status === "unpaid") {
      ensure();
    } else {
      loadExisting().catch(() => {});
    }

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
      <div className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
        <div className="mx-auto flex h-64 max-w-5xl items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
        </div>
      </div>
    );

  if (query.isError)
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
        <div className="mx-auto flex h-64 max-w-5xl flex-col items-center justify-center space-y-4">
          <div className="text-red-400">Failed to load order.</div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
          >
            Go Back
          </Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-6 pb-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Order Detail
              </div>
              <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
                #{order.order_number}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={paymentVariant(order.payment_status)}>
              {titleCase(order.payment_status)}
            </Badge>
            <Badge variant={statusVariant(order.status)}>
              {titleCase(order.status)}
            </Badge>
          </div>
        </div>

        {liveMessage && (
          <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <div className="flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-zinc-950/90 px-4 py-2 text-sm text-[var(--accent)] shadow-lg backdrop-blur">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
              {liveMessage}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="bg-zinc-900/50 backdrop-blur">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Track Order</CardTitle>
                <div className="text-xs text-zinc-400">{totalItems} items</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <OrderStatusTimeline status={order.status} />

                {order.payment_status === "unpaid" && method?.instructions && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm leading-relaxed text-blue-100/80">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-300">
                      <Info className="h-4 w-4" /> Instructions
                    </div>
                    <div className="whitespace-pre-line">
                      {method.instructions}
                    </div>
                  </div>
                )}

                {isDokuCheckout && order.payment_status === "unpaid" && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-100">
                          Pembayaran DOKU
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          Total: Rp{" "}
                          {Number(order.total_amount ?? 0).toLocaleString(
                            "id-ID",
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
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
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate ulang
                      </Button>
                    </div>

                    {dokuError ? (
                      <div className="mt-3 text-sm text-red-400">
                        {dokuError}
                      </div>
                    ) : null}

                    <div className="mt-4 space-y-3">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => {
                          if (dokuUrl) window.open(dokuUrl, "_blank");
                        }}
                        disabled={!dokuUrl || dokuLoading}
                      >
                        Bayar sekarang
                      </Button>
                      <div className="text-xs text-zinc-500">
                        Status akan otomatis berubah menjadi paid setelah pembayaran berhasil.
                      </div>
                      {dokuTx?.reference_no ? (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                          Token: {dokuTx.reference_no}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 backdrop-blur">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-zinc-500" />
                  <CardTitle className="text-base">Items</CardTitle>
                </div>
                <div className="text-xs text-zinc-400">({totalItems})</div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(order.items ?? []).map((it) => (
                  <div
                    key={it.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-100">
                          {it.product_name}
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          Rp{" "}
                          {Number(it.product_price ?? 0).toLocaleString(
                            "id-ID",
                          )}{" "}
                          × {it.quantity}
                        </div>

                        {Array.isArray(it.modifier_options) &&
                        it.modifier_options.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {it.modifier_options.map((m, idx) => (
                              <span
                                key={idx}
                                className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400"
                              >
                                {m.option_name}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {it.item_notes ? (
                          <div className="mt-2 text-xs italic text-zinc-500">
                            "{it.item_notes}"
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right font-medium text-zinc-100">
                        Rp {Number(it.subtotal ?? 0).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-zinc-500" />
                  <CardTitle className="text-base">Order Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {order.gym ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-400">Gym Location</span>
                    <span className="truncate text-right font-medium text-zinc-100">
                      {order.gym.gym_name}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-400">Subtotal</span>
                  <span>
                    Rp {Number(order.subtotal ?? 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-400">Delivery Fee</span>
                  <span>
                    Rp {Number(order.delivery_fee ?? 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-400">Discount</span>
                  <span className="text-[var(--accent)]">
                    -Rp{" "}
                    {Number(order.discount_amount ?? 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="border-t border-zinc-800 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-100">
                      Total Amount
                    </span>
                    <span className="text-base font-semibold text-zinc-100">
                      Rp{" "}
                      {Number(order.total_amount ?? 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-zinc-500" />
                  <CardTitle className="text-base">Delivery</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-zinc-500">Recipient</div>
                  <div className="mt-1 font-medium text-zinc-100">
                    {order.recipient_name}
                  </div>
                  <div className="text-zinc-400">{order.recipient_phone}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Address</div>
                  <div className="mt-1 whitespace-pre-line text-zinc-300">
                    {order.delivery_address}
                  </div>
                </div>
                {order.delivery_notes ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
                    Note: {order.delivery_notes}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-zinc-500" />
                  <CardTitle className="text-base">Payment</CardTitle>
                </div>
                <Badge variant={paymentVariant(order.payment_status)}>
                  {titleCase(order.payment_status)}
                </Badge>
              </CardHeader>
              <CardContent className="text-sm text-zinc-300">
                {paymentLabel}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
