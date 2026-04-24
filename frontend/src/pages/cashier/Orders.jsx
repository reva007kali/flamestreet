import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEcho } from "@/components/common/RealtimeProvider";
import {
  Clock,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  RefreshCw,
  User,
  Phone,
  Banknote,
  ChevronRight,
} from "lucide-react";

const statusConfig = {
  pending: {
    label: "Pending",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    side: "bg-amber-500",
    icon: <Clock size={10} />,
  },
  confirmed: {
    label: "Confirm",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    side: "bg-blue-500",
    icon: <CheckCircle2 size={10} />,
  },
  delivering: {
    label: "Ship",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    side: "bg-purple-500",
    icon: <Truck size={10} />,
  },
  delivered: {
    label: "Done",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    side: "bg-emerald-500",
    icon: <Package size={10} />,
  },
  cancelled: {
    label: "Cancel",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    side: "bg-rose-500",
    icon: <XCircle size={10} />,
  },
  refunded: {
    label: "Refund",
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
    border: "border-zinc-500/20",
    side: "bg-zinc-500",
    icon: <RefreshCw size={10} />,
  },
};

const statuses = Object.keys(statusConfig);
const paymentStatuses = ["unpaid", "paid", "refunded"];

function titleCase(s) {
  const v = String(s ?? "").trim();
  if (!v) return "-";
  return v
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Orders() {
  const echo = useEcho();
  const qc = useQueryClient();
  const navigate = useNavigate();

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
    <div className="max-w-xl mx-auto space-y-4 pb-24">
      {/* COMPACT HEADER */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black italic uppercase tracking-tighter">
            Orders
          </h1>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
            Master Management
          </p>
        </div>
        <div className="flex gap-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="text-center px-2">
            <div className="text-xs font-black text-white">{orders.length}</div>
            <div className="text-[7px] font-bold text-zinc-500 uppercase">
              Total
            </div>
          </div>
          <div className="text-center px-2 border-l border-zinc-800">
            <div className="text-xs font-black text-blue-500">
              {orders.filter((o) => o.status === "pending").length}
            </div>
            <div className="text-[7px] font-bold text-zinc-500 uppercase">
              New
            </div>
          </div>
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-3">
        {orders.map((o) => {
          const cfg = statusConfig[o.status] || statusConfig.pending;

          return (
            <Card
              key={o.id}
              className="relative overflow-hidden border-zinc-800/60 bg-zinc-950/40 shadow-md"
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.side}`}
              />

              <div className="p-3 space-y-3">
                {/* Info Utama - Tap to open detail */}
                <div
                  className="flex justify-between items-start"
                  onClick={() => navigate(`/cashier/orders/${o.order_number}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white leading-none">
                        {o.order_number}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[8px] h-4 px-1 border-zinc-800 text-zinc-500 font-bold uppercase`}
                      >
                        {o.payment_status}
                      </Badge>
                    </div>
                    <div className="mt-2 text-[12px] font-black uppercase tracking-wide text-[var(--accent)]">
                      Payment: {titleCase(o.payment_method)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 mt-1.5">
                      <User size={10} className="text-zinc-600" />
                      <span className="truncate">{o.recipient_name}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="text-xs font-black text-white tabular-nums">
                      Rp{Number(o.total_amount ?? 0).toLocaleString("id-ID")}
                    </div>
                    <button className="flex items-center text-[9px] font-bold text-[var(--accent)] uppercase tracking-tight">
                      Detail <ChevronRight size={10} />
                    </button>
                  </div>
                </div>

                {/* Status Toggle Buttons (Horizontal Scroll) */}
                <div className="space-y-2">
                  <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                    {statuses.map((s) => {
                      const isActive = o.status === s;
                      const sCfg = statusConfig[s];
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            update.mutate({ id: o.id, payload: { status: s } })
                          }
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[9px] font-black uppercase transition-all shrink-0 border ${
                            isActive
                              ? `${sCfg.bg} ${sCfg.color} ${sCfg.border.replace("20", "50")}`
                              : "bg-zinc-900 text-zinc-600 border-zinc-800"
                          }`}
                        >
                          {sCfg.icon} {sCfg.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Payment Toggle Buttons */}
                  <div className="flex gap-1 border-t border-zinc-900 pt-2">
                    {paymentStatuses.map((ps) => {
                      const isActive = o.payment_status === ps;
                      return (
                        <button
                          key={ps}
                          onClick={() =>
                            update.mutate({
                              id: o.id,
                              payload: { payment_status: ps },
                            })
                          }
                          className={`flex-1 py-1 rounded-md text-[8px] font-black uppercase transition-all border ${
                            isActive
                              ? "bg-zinc-100 text-black border-white"
                              : "bg-zinc-900/50 text-zinc-600 border-zinc-900"
                          }`}
                        >
                          {ps}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* LOADING STATE */}
      {query.isLoading && (
        <div className="flex flex-col items-center py-20 gap-3">
          <RefreshCw size={24} className="text-zinc-800 animate-spin" />
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">
            Syncing...
          </span>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `,
        }}
      />
    </div>
  );
}
