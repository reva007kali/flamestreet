import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEcho } from "@/components/common/RealtimeProvider";
import { playNotifySound } from "@/lib/notifySound";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  Truck,
  Phone,
  MapPin,
  ShoppingBag,
  X,
  ChevronRight,
} from "lucide-react";

const STATUSES = ["pending", "confirmed", "delivering", "delivered"];

const NEXT_LABEL = {
  pending: "Konfirmasi",
  confirmed: "Antar",
  delivering: "Selesai",
  delivered: null,
};

export default function Queue() {
  const echo = useEcho();
  const qc = useQueryClient();
  const previousRef = useRef({ ids: [], statuses: new Map() });
  const [expandedId, setExpandedId] = useState(null);
  const [droppedId, setDroppedId] = useState(null);

  const query = useQuery({
    queryKey: ["staff", "orders", { status: "queue" }],
    queryFn: async () =>
      (await api.get("/staff/orders", { params: { status: "queue" } })).data,
    refetchInterval: 3000,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }) =>
      (await api.put(`/staff/orders/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "orders"] });
      playNotifySound("status");
    },
  });

  const cancel = useMutation({
    mutationFn: async (id) =>
      (await api.post(`/staff/orders/${id}/cancel`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "orders"] });
      playNotifySound("status");
    },
  });

  const orders = query.data?.data ?? [];
  const money = (v) => `Rp${Number(v ?? 0).toLocaleString("id-ID")}`;

  function nextStatus(current) {
    const idx = STATUSES.indexOf(current);
    return idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
  }

  return (
    <div className="max-w-md mx-auto space-y-3 pb-24 p-2">
      {/* COMPACT HEADER */}
      <div className="flex items-center justify-between px-1 pt-2">
        <div>
          <h1 className="text-xl font-black italic tracking-tighter">QUEUE</h1>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Live Updates</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="text-right">
            <div className="text-sm font-black leading-none">{orders.length}</div>
            <div className="text-[8px] font-bold text-zinc-500 uppercase">Total</div>
          </div>
          <div className="text-right border-l border-zinc-800 pl-2">
            <div className="text-sm font-black leading-none text-emerald-500">
              {orders.filter((o) => o.payment_status === "paid").length}
            </div>
            <div className="text-[8px] font-bold text-zinc-500 uppercase">Paid</div>
          </div>
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-2">
        {orders.map((o) => {
          const isExpanded = expandedId === o.id;
          const isDropped = droppedId === o.id;
          const isPaid = o.payment_status === "paid";
          const ns = nextStatus(o.status);
          const nextLabel = NEXT_LABEL[o.status];

          return (
            <Card
              key={o.id}
              className={`bg-zinc-900 border-zinc-800/60 overflow-hidden transition-all ${isExpanded ? "ring-1 ring-[var(--accent)]/50" : ""}`}
            >
              {/* HEADER AREA */}
              <div className="p-3">
                {/* Top row: name + cancel */}
                <div className="flex justify-between items-start mb-2">
                  <div
                    className="cursor-pointer flex-1"
                    onClick={() => setDroppedId(isDropped ? null : o.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-white tracking-tight">
                        {o.recipient_name}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-500">
                        #{o.order_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-500 mt-0.5">
                      <ShoppingBag size={10} />
                      <span className="text-[10px] font-medium truncate max-w-[150px]">
                        {o.items?.length} items • {o.items?.[0]?.product_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-sm font-black text-white leading-none mb-1">
                        {money(o.total_amount)}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[8px] h-4 px-1 uppercase font-black ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-900/50"
                            : "bg-rose-500/10 text-rose-500 border-rose-900/50"
                        }`}
                      >
                        {o.payment_status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Progress row: single dynamic button + Lihat Detail */}
                <div className="flex items-center gap-2 mt-3">
                  {nextLabel ? (
                    <button
                      onClick={() => {
                        playNotifySound("status");
                        update.mutate({ id: o.id, payload: { status: ns } });
                      }}
                      className={`flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all ${
                        o.status === "pending"
                          ? "bg-emerald-500 text-black"
                          : o.status === "confirmed"
                            ? "bg-blue-500 text-white"
                            : "bg-emerald-600 text-white"
                      }`}
                    >
                      {o.status === "pending" && <Check size={12} />}
                      {o.status === "confirmed" && <Truck size={12} />}
                      {o.status === "delivering" && <Check size={12} />}
                      {nextLabel}
                    </button>
                  ) : (
                    <div className="flex-1 h-9 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <Check size={12} />
                      Selesai
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                    className="h-9 rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-[9px] font-bold text-zinc-400 uppercase flex items-center gap-1 hover:bg-zinc-700 transition-colors"
                  >
                    {isExpanded ? "Tutup" : "Lihat Detail"}
                    {isExpanded ? (
                      <ChevronUp size={11} />
                    ) : (
                      <ChevronDown size={11} />
                    )}
                  </button>
                </div>

                {/* DROP DOWN - Brief Info */}
                {isDropped && !isExpanded && (
                  <div className="mt-3 p-3 rounded-xl border border-zinc-800 bg-black/20 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      <Phone size={10} className="shrink-0" />
                      <span>{o.recipient_phone || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      <MapPin size={10} className="shrink-0" />
                      <span className="truncate">{o.delivery_address || "No Address"}</span>
                    </div>
                    <button
                      onClick={() => setExpandedId(true)}
                      className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1 hover:underline"
                    >
                      Lihat Detail Lengkap
                      <ChevronRight size={10} />
                    </button>
                  </div>
                )}
              </div>

              {/* EXPANDED ACCORDION DETAILS */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-zinc-800 bg-zinc-900/20 animate-in slide-in-from-top-1">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 py-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800">
                        <Phone size={10} className="text-zinc-400" />
                      </div>
                      <div className="text-[10px] font-bold text-zinc-300 truncate">
                        {o.recipient_phone || "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800">
                        <MapPin size={10} className="text-zinc-400" />
                      </div>
                      <div className="text-[10px] font-bold text-zinc-300 truncate">
                        {o.delivery_address || "No Address"}
                      </div>
                    </div>
                  </div>

                  {/* Items list with modifiers */}
                  <div className="space-y-2 mb-3">
                    {o.items?.map((it) => (
                      <div
                        key={it.id}
                        className="bg-black/20 p-2.5 rounded-xl border border-zinc-900"
                      >
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-300">
                            <b className="text-white font-black">{it.quantity}x</b>{" "}
                            {it.product_name}
                          </span>
                          <span className="font-bold text-white">
                            {money(it.subtotal)}
                          </span>
                        </div>
                        {/* Modifiers */}
                        {(it.modifier_options || it.modifiers)?.length > 0 && (
                          <div className="mt-1.5 pl-3 space-y-0.5">
                            {(it.modifier_options || it.modifiers).map((mod, mi) => (
                              <div
                                key={mi}
                                className="flex justify-between text-[9px] text-zinc-500"
                              >
                                <span>+ {mod.option_name || mod.modifier_name || mod.name}</span>
                                <span>
                                  {Number(mod.additional_price ?? mod.price ?? 0) > 0
                                    ? `+${money(mod.additional_price ?? mod.price)}`
                                    : "FREE"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {it.notes && (
                          <div className="mt-1 text-[9px] text-amber-500/70 italic">
                            Note: {it.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-zinc-800 pt-2 mb-3 space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Subtotal</span>
                      <span>{money(o.subtotal ?? o.total_amount)}</span>
                    </div>
                    {Number(o.discount_amount ?? 0) > 0 && (
                      <div className="flex justify-between text-[10px] text-emerald-500">
                        <span>Discount</span>
                        <span>-{money(o.discount_amount)}</span>
                      </div>
                    )}
                    {Number(o.delivery_fee ?? 0) > 0 && (
                      <div className="flex justify-between text-[10px] text-zinc-500">
                        <span>Delivery</span>
                        <span>{money(o.delivery_fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] font-black text-white pt-1 border-t border-zinc-800">
                      <span>Total</span>
                      <span>{money(o.total_amount)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Payment Toggle */}
                    <button
                      onClick={() => {
                        if (window.confirm("Apakah yakin customer sudah membayar?")) {
                          playNotifySound("success");
                          update.mutate({
                            id: o.id,
                            payload: { payment_status: isPaid ? "unpaid" : "paid" },
                          });
                        }
                      }}
                      className={`w-full h-8 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                        isPaid
                          ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      <Check size={11} />
                      {isPaid ? "Batalkan Pembayaran" : "Sudah Dibayar"}
                    </button>

                    {/* Cancel Button */}
                    <button
                      onClick={() => {
                        if (window.confirm("Yakin ingin membatalkan orderan ini?")) {
                          playNotifySound("status");
                          update.mutate({
                            id: o.id,
                            payload: { status: "cancelled" },
                          });
                        }
                      }}
                      className="w-full h-8 rounded-xl border border-rose-900/50 bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <X size={11} />
                      Batalkan Order
                    </button>
                  </div>
                </div>
              )}

              {/* Expand toggle chevron */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : o.id)}
                className="w-full flex justify-center py-1 bg-zinc-900/40 border-t border-zinc-900"
              >
                {isExpanded ? (
                  <ChevronUp size={12} className="text-zinc-600" />
                ) : (
                  <ChevronDown size={12} className="text-zinc-600" />
                )}
              </button>
            </Card>
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {!query.isLoading && orders.length === 0 && (
        <div className="py-20 text-center">
          <Package size={40} className="mx-auto text-zinc-800 mb-2" />
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            Antrian Kosong
          </p>
        </div>
      )}
    </div>
  );
}
