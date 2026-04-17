import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEcho } from "@/components/common/RealtimeProvider";
import { playNotifySound } from "@/lib/notifySound";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Package,
  RefreshCw,
  Truck,
  UserCheck,
  Wallet,
  XCircle,
  MapPin,
  Phone,
  CreditCard,
  ShoppingBag,
} from "lucide-react";

const statuses = [
  "pending",
  "confirmed",
  "delivering",
  "delivered",
  "cancelled",
  "refunded",
];

const statusStyles = {
  pending: {
    border: "border-amber-500",
    bg: "bg-amber-500/10",
    icon: <Clock className="text-amber-500" size={14} />,
    label: "text-amber-500",
    glow: "shadow-amber-500/10",
  },
  confirmed: {
    border: "border-blue-500",
    bg: "bg-blue-500/10",
    icon: <CheckCircle2 className="text-blue-500" size={14} />,
    label: "text-blue-500",
    glow: "shadow-blue-500/10",
  },
  delivering: {
    border: "border-purple-500",
    bg: "bg-purple-500/10",
    icon: <Truck className="text-purple-500" size={14} />,
    label: "text-purple-500",
    glow: "shadow-purple-500/10",
  },
  delivered: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    icon: <Package className="text-emerald-500" size={14} />,
    label: "text-emerald-500",
    glow: "shadow-emerald-500/10",
  },
  cancelled: {
    border: "border-rose-500",
    bg: "bg-rose-500/10",
    icon: <XCircle className="text-rose-500" size={14} />,
    label: "text-rose-500",
    glow: "shadow-rose-500/10",
  },
  refunded: {
    border: "border-zinc-500",
    bg: "bg-zinc-500/10",
    icon: <RefreshCw className="text-zinc-500" size={14} />,
    label: "text-zinc-500",
    glow: "shadow-zinc-500/10",
  },
};

export default function Queue() {
  const echo = useEcho();
  const qc = useQueryClient();
  const previousRef = useRef({ ids: [], statuses: new Map() });
  const [liveMessage, setLiveMessage] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const couriersQuery = useQuery({
    queryKey: ["staff", "couriers"],
    queryFn: async () => (await api.get("/staff/couriers")).data.couriers,
  });

  const query = useQuery({
    queryKey: ["staff", "orders", { status: "queue" }],
    queryFn: async () =>
      (await api.get("/staff/orders", { params: { status: "queue" } })).data,
    refetchInterval: 3000,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }) =>
      (await api.put(`/staff/orders/${id}`, payload)).data.order,
    onMutate: async ({ id, payload }) => {
      qc.setQueriesData({ queryKey: ["staff", "orders"] }, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o) => (o.id === id ? { ...o, ...payload } : o)),
        };
      });
    },
    onSuccess: () => query.refetch(),
  });

  const assign = useMutation({
    mutationFn: async ({ id, courier_id }) =>
      (await api.put(`/staff/orders/${id}/assign-courier`, { courier_id })).data
        .order,
    onMutate: async ({ id, courier_id }) => {
      qc.setQueriesData({ queryKey: ["staff", "orders"] }, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((o) => (o.id === id ? { ...o, courier_id } : o)),
        };
      });
    },
    onSuccess: () => query.refetch(),
  });

  const orders = query.data?.data ?? [];
  const couriers = couriersQuery.data ?? [];
  const money = (v) => `Rp ${Number(v ?? 0).toLocaleString("id-ID")}`;

  function normalizeMods(modifierOptions) {
    if (!Array.isArray(modifierOptions)) return [];
    const rows = modifierOptions
      .map((m) => ({
        modifier_name: m?.modifier_name ? String(m.modifier_name) : "",
        option_name: m?.option_name ? String(m.option_name) : "",
        additional_price: Number(m?.additional_price ?? 0),
      }))
      .filter((m) => m.modifier_name && m.option_name);

    const map = new Map();
    for (const r of rows) {
      const arr = map.get(r.modifier_name) ?? [];
      arr.push(r);
      map.set(r.modifier_name, arr);
    }
    return Array.from(map.entries()).map(([modifierName, opts]) => ({
      modifierName,
      opts,
    }));
  }

  useEffect(() => {
    if (!orders.length) {
      previousRef.current = { ids: [], statuses: new Map() };
      return;
    }
    const prevIds = previousRef.current.ids;
    const prevStatuses = previousRef.current.statuses;
    const nextIds = orders.map((o) => o.id);
    const nextStatuses = new Map(
      orders.map((o) => [o.id, `${o.status}|${o.payment_status}`]),
    );

    const newOrder = orders.find((o) => !prevIds.includes(o.id));
    if (newOrder && prevIds.length) {
      setLiveMessage(`🚨 NEW ORDER: ${newOrder.order_number}`);
      playNotifySound("default");
    } else {
      const changed = orders.find(
        (o) =>
          prevStatuses.has(o.id) &&
          prevStatuses.get(o.id) !== `${o.status}|${o.payment_status}`,
      );
      if (changed) {
        setLiveMessage(`🔄 UPDATED: ${changed.order_number}`);
        playNotifySound("status");
      }
    }
    previousRef.current = { ids: nextIds, statuses: nextStatuses };
  }, [orders]);

  useEffect(() => {
    if (!liveMessage) return;
    const timer = window.setTimeout(() => setLiveMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [liveMessage]);

  useEffect(() => {
    if (!echo) return;
    const channel = echo.private("staff.orders");
    channel.listen(".OrderQueueUpdated", () => {
      qc.invalidateQueries({ queryKey: ["staff", "orders"] });
    });
    return () => {
      echo.leave("staff.orders");
    };
  }, [echo, qc]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 pt-4">
      {/* HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500/80">
              System Live
            </span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none">
            Order <span className="text-zinc-500">Queue</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 backdrop-blur-xl">
          <div className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-center min-w-[80px]">
            <div className="text-lg font-black text-white">{orders.length}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Active</div>
          </div>
          <div className="px-4 py-2 text-center min-w-[80px]">
            <div className="text-lg font-black text-emerald-500">
              {orders.filter((o) => o.payment_status === "paid").length}
            </div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Paid</div>
          </div>
        </div>
      </div>

      {/* NOTIFICATION TOAST */}
      {liveMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-8 fade-in duration-500">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-2xl px-6 py-3 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-emerald-500/50">
            <div className="bg-emerald-500/20 p-2 rounded-full">
               <Activity size={16} className="text-emerald-400 animate-pulse" />
            </div>
            <span className="text-sm font-black uppercase tracking-tight text-white">
              {liveMessage}
            </span>
          </div>
        </div>
      )}

      {/* ORDERS LIST */}
      <div className="grid gap-4">
        {orders.map((o) => {
          const style = statusStyles[o.status] || statusStyles.pending;
          const items = Array.isArray(o.items) ? o.items : [];
          const isExpanded = expandedId === o.id;

          return (
            <Card
              key={o.id}
              className={`group overflow-hidden border-zinc-800/50 bg-zinc-900/30 transition-all duration-300 hover:bg-zinc-900/50 ${
                isExpanded ? "ring-1 ring-zinc-700 shadow-2xl" : ""
              }`}
            >
              <div className="relative">
                {/* Status Indicator Sidebar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bg.replace('/10', '')} ${style.glow} shadow-[4px_0_15px_-3px_rgba(0,0,0,0.1)]`} />
                
                <div 
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : o.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-lg font-black text-white tracking-tight">{o.recipient_name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-500 tracking-tighter">#{o.order_number}</span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <MapPin size={12} className="shrink-0" />
                          <span className="text-xs font-medium truncate max-w-md">
                            {o.delivery_address || o.delivery_notes || o.gym?.address || "No Address"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <ShoppingBag size={12} className="shrink-0" />
                          <span className="text-[11px] font-bold uppercase tracking-wide">
                            {items.length} Items • {items.slice(0, 2).map(it => it.product_name).join(", ")}{items.length > 2 ? '...' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0">
                       <div className="text-xl font-black text-white tabular-nums tracking-tighter">
                        {money(o.total_amount)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`border-none rounded-full text-[10px] font-black uppercase tracking-wider px-3 py-1 ${style.bg} ${style.label}`}>
                          {o.status}
                        </Badge>
                        <Badge className={`border-none rounded-full text-[10px] font-black uppercase tracking-wider px-3 py-1 ${o.payment_status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                          {o.payment_status}
                        </Badge>
                        <ChevronDown size={18} className={`text-zinc-600 transition-transform duration-300 ${isExpanded ? "rotate-180 text-white" : ""}`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXPANDED CONTENT */}
                {isExpanded && (
                  <CardContent className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-6" />
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left: Info Grid */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                              <Phone size={12} /> Contact
                            </div>
                            <div className="text-sm font-bold text-white">{o.recipient_phone || "No Phone"}</div>
                          </div>
                          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                              <CreditCard size={12} /> Payment Method
                            </div>
                            <div className="text-sm font-bold text-white uppercase tracking-tight">{o.payment_method || "-"}</div>
                          </div>
                        </div>

                        {/* Items Table-like List */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Order Items</h4>
                          <div className="space-y-2">
                            {items.map((it) => {
                              const mods = normalizeMods(it.modifier_options);
                              return (
                                <div key={it.id} className="group/item p-4 rounded-2xl border border-zinc-800/50 bg-zinc-950/20 hover:bg-zinc-900/40 transition-colors">
                                  <div className="flex justify-between gap-4">
                                    <div className="space-y-1">
                                      <div className="text-sm font-bold text-white">{it.product_name}</div>
                                      <div className="text-[11px] text-zinc-500 font-medium">
                                        {it.quantity}x {money(it.product_price)}
                                      </div>
                                    </div>
                                    <div className="text-sm font-black text-white tabular-nums">
                                      {money(it.subtotal)}
                                    </div>
                                  </div>
                                  
                                  {mods.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-zinc-800/50 flex flex-wrap gap-x-4 gap-y-1">
                                      {mods.map((g) => (
                                        <div key={g.modifierName} className="text-[10px]">
                                          <span className="font-bold text-zinc-500 uppercase">{g.modifierName}:</span>{" "}
                                          <span className="text-zinc-300 font-semibold">{g.opts.map(m => m.option_name).join(", ")}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {it.item_notes && (
                                    <div className="mt-2 text-[11px] italic text-amber-500/80 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                                      Note: {it.item_notes}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="space-y-6">
                        <div className="p-5 rounded-3xl bg-zinc-950/60 border border-zinc-800 space-y-5 shadow-inner">
                          <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Management</h4>
                          
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Order Status</Label>
                              <Select
                                value={o.status}
                                onValueChange={(v) => update.mutate({ id: o.id, payload: { status: v } })}
                              >
                                <SelectTrigger className="h-11 bg-zinc-900 border-zinc-800 text-[11px] font-black uppercase rounded-xl ring-offset-zinc-950">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                  {statuses.map((s) => (
                                    <SelectItem key={s} value={s} className="text-[11px] font-bold uppercase focus:bg-zinc-800 focus:text-white capitalize">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Payment Status</Label>
                              <Select
                                value={o.payment_status}
                                onValueChange={(v) => update.mutate({ id: o.id, payload: { payment_status: v } })}
                              >
                                <SelectTrigger className="h-11 bg-zinc-900 border-zinc-800 text-[11px] font-black uppercase rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                  {["unpaid", "paid", "refunded"].map((s) => (
                                    <SelectItem key={s} value={s} className="text-[11px] font-bold uppercase">
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">Assign Courier</Label>
                              <Select
                                value={o.courier_id ? String(o.courier_id) : ""}
                                onValueChange={(v) => assign.mutate({ id: o.id, courier_id: Number(v) })}
                              >
                                <SelectTrigger className="h-11 bg-zinc-900 border-zinc-800 text-[11px] font-black uppercase rounded-xl">
                                  <div className="flex items-center gap-2">
                                    <UserCheck size={14} className="text-zinc-500" />
                                    <SelectValue placeholder="SELECT COURIER" />
                                  </div>
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                  {couriers.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)} className="text-[11px] font-bold uppercase">
                                      {c.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="pt-4 grid grid-cols-1 gap-2">
                            <Button
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest h-11 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all"
                              onClick={() => update.mutate({ id: o.id, payload: { status: "confirmed" } })}
                              disabled={update.isPending || o.status === "confirmed"}
                            >
                              Confirm Order
                            </Button>
                            <Button
                              variant="secondary"
                              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-[10px] tracking-widest h-11 rounded-xl border border-zinc-700 active:scale-[0.98] transition-all"
                              onClick={() => update.mutate({ id: o.id, payload: { payment_status: "paid" } })}
                              disabled={update.isPending || o.payment_status === "paid"}
                            >
                              <Wallet size={12} className="mr-2" /> Mark as Paid
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* LOADING STATE */}
      {query.isLoading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="relative">
            <RefreshCw size={48} className="text-zinc-800 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 animate-pulse">
            Syncing Operations...
          </span>
        </div>
      )}

      {/* EMPTY STATE */}
      {!query.isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed border-zinc-900 bg-zinc-950/30 text-center">
          <div className="h-24 w-24 rounded-full bg-zinc-900/50 flex items-center justify-center mb-8 border border-zinc-800 shadow-2xl">
            <Package className="h-10 w-10 text-zinc-700" />
          </div>
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">
            Queue Clear
          </h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">
            No active orders at the moment
          </p>
        </div>
      )}
    </div>
  );
}

function Label({ className, children }) {
  return <div className={className}>{children}</div>;
}