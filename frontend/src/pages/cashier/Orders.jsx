import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEcho } from "@/components/common/RealtimeProvider";
import SidePanel from "@/components/common/SidePanel";
import OrderQuickDetail from "@/components/order/OrderQuickDetail";
import {
  Clock,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  LayoutDashboard,
  User,
  Phone,
  Banknote,
} from "lucide-react";

const statusConfig = {
  pending: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    side: "bg-amber-500",
    icon: <Clock size={14} />,
  },
  confirmed: {
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    side: "bg-blue-500",
    icon: <CheckCircle2 size={14} />,
  },
  delivering: {
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    side: "bg-purple-500",
    icon: <Truck size={14} />,
  },
  delivered: {
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    side: "bg-emerald-500",
    icon: <Package size={14} />,
  },
  cancelled: {
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    side: "bg-rose-500",
    icon: <XCircle size={14} />,
  },
  refunded: {
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    side: "bg-zinc-500",
    icon: <RefreshCw size={14} />,
  },
};

const statuses = Object.keys(statusConfig);

export default function Orders() {
  const echo = useEcho();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);

  const query = useQuery({
    queryKey: ["staff", "orders", { all: true }],
    queryFn: async () => (await api.get("/staff/orders")).data,
    refetchInterval: 5000,
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

  const orders = query.data?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 pt-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard size={14} className="text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              Staff Control Area
            </span>
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            Manage <span className="text-zinc-500">Orders</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
          <div className="px-4 py-1 text-center border-r border-zinc-800">
            <div className="text-lg font-black text-white">{orders.length}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              Total
            </div>
          </div>
          <div className="px-4 py-1 text-center">
            <div className="text-lg font-black text-blue-500">
              {orders.filter((o) => o.status === "pending").length}
            </div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
              New
            </div>
          </div>
        </div>
      </div>

      {/* ORDERS GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {orders.map((o) => {
          const cfg = statusConfig[o.status] || statusConfig.pending;

          return (
            <Card
              key={o.id}
              className={`relative overflow-hidden border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40 transition-all duration-300 group shadow-lg`}
            >
              {/* Status Accent Bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.side}`}
              />

              <div className="p-5 space-y-5">
                {/* Header Card */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1" onClick={() => setSelected(o)}>
                    <div className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm font-black text-white group-hover:text-[var(--accent)] transition-colors">
                        {o.order_number}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-black uppercase px-2 py-0 border-zinc-800 text-zinc-400`}
                      >
                        {o.payment_status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <User size={12} /> {o.recipient_name}
                    </div>
                  </div>

                  <Badge
                    className={`border-none rounded-lg text-[10px] font-black uppercase tracking-wider px-2 py-1 ${cfg.bg} ${cfg.color} flex items-center gap-1.5`}
                  >
                    {cfg.icon} {o.status}
                  </Badge>
                </div>

                {/* Body Card */}
                <div
                  className="grid grid-cols-2 gap-4 py-2 border-y border-zinc-900/50"
                  onClick={() => setSelected(o)}
                >
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                      Total Amount
                    </div>
                    <div className="text-sm font-black text-white tabular-nums">
                      Rp {Number(o.total_amount ?? 0).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                      Contact
                    </div>
                    <div className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                      <Phone size={10} /> {o.recipient_phone}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="flex-1 min-w-[140px]">
                    <Select
                      value={o.status}
                      onValueChange={(v) =>
                        update.mutate({ id: o.id, payload: { status: v } })
                      }
                    >
                      <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-[10px] font-black uppercase rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {statuses.map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            className="text-[10px] font-bold uppercase"
                          >
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <Select
                      value={o.payment_status}
                      onValueChange={(v) =>
                        update.mutate({
                          id: o.id,
                          payload: { payment_status: v },
                        })
                      }
                    >
                      <SelectTrigger className="h-9 bg-zinc-900 border-zinc-800 text-[10px] font-black uppercase rounded-xl">
                        <div className="flex items-center gap-2">
                          <Banknote size={12} className="text-zinc-500" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {["unpaid", "paid", "refunded"].map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            className="text-[10px] font-bold uppercase"
                          >
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* LOADING STATE */}
      {query.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-zinc-800 border-t-[var(--accent)] rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
            Syncing Master Data...
          </span>
        </div>
      )}

      {/* SIDE PANEL */}
      <SidePanel
        open={Boolean(selected)}
        title={
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Order Management
            </span>
            <span className="text-xl font-black italic uppercase tracking-tighter">
              {selected ? `#${selected.order_number}` : "Loading..."}
            </span>
          </div>
        }
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="mt-6">
            <OrderQuickDetail
              mode="staff"
              orderId={selected.id}
              onUpdated={() => {
                query.refetch();
                qc.invalidateQueries({ queryKey: ["staff", "orders"] });
              }}
            />
          </div>
        ) : null}
      </SidePanel>
    </div>
  );
}
