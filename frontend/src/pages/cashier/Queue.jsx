import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEcho } from "@/components/common/RealtimeProvider";
import { playNotifySound } from "@/lib/notifySound";
import {
  Activity, Check, ChevronDown, ChevronUp, Clock, Package, 
  RefreshCw, Truck, User, Wallet, Phone, MapPin, ShoppingBag
} from "lucide-react";

const statuses = ["pending", "confirmed", "delivering", "delivered"];

export default function Queue() {
  const echo = useEcho();
  const qc = useQueryClient();
  const previousRef = useRef({ ids: [], statuses: new Map() });
  const [expandedId, setExpandedId] = useState(null);

  const query = useQuery({
    queryKey: ["staff", "orders", { status: "queue" }],
    queryFn: async () => (await api.get("/staff/orders", { params: { status: "queue" } })).data,
    refetchInterval: 3000,
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }) => (await api.put(`/staff/orders/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff", "orders"] });
      playNotifySound("status");
    },
  });

  const orders = query.data?.data ?? [];
  const money = (v) => `Rp${Number(v ?? 0).toLocaleString("id-ID")}`;

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
                {orders.filter(o => o.payment_status === 'paid').length}
              </div>
              <div className="text-[8px] font-bold text-zinc-500 uppercase">Paid</div>
           </div>
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-2">
        {orders.map((o) => {
          const isExpanded = expandedId === o.id;
          const isPaid = o.payment_status === "paid";

          return (
            <Card key={o.id} className={`bg-zinc-900 border-zinc-800/60 overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-[var(--accent)]/50' : ''}`}>
              {/* HEADER AREA (Main Info) */}
              <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <div onClick={() => setExpandedId(isExpanded ? null : o.id)} className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-white tracking-tight">{o.recipient_name}</span>
                      <span className="text-[9px] font-bold text-zinc-500">#{o.order_number}</span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-500 mt-0.5">
                      <ShoppingBag size={10} />
                      <span className="text-[10px] font-medium truncate max-w-[150px]">
                        {o.items?.length} items • {o.items?.[0]?.product_name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white leading-none mb-1">{money(o.total_amount)}</div>
                    <Badge variant="outline" className={`text-[8px] h-4 px-1 uppercase font-black ${isPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-900/50' : 'bg-rose-500/10 text-rose-500 border-rose-900/50'}`}>
                      {o.payment_status}
                    </Badge>
                  </div>
                </div>

                {/* QUICK ACTION STATUS (Visible always) */}
                <div className="flex gap-1 mt-3 overflow-x-auto no-scrollbar pb-1">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => update.mutate({ id: o.id, payload: { status: s } })}
                      className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase flex-1 min-w-fit transition-all border ${
                        o.status === s 
                        ? 'bg-white text-black border-white' 
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {s === 'pending' && <Clock size={10} className="inline mr-1" />}
                      {s === 'confirmed' && <Check size={10} className="inline mr-1" />}
                      {s === 'delivering' && <Truck size={10} className="inline mr-1" />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* EXPANDED DETAILS */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-zinc-900 bg-zinc-900/20 animate-in slide-in-from-top-1">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 py-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800"><Phone size={10} className="text-zinc-400" /></div>
                      <div className="text-[10px] font-bold text-zinc-300 truncate">{o.recipient_phone || '-'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800"><MapPin size={10} className="text-zinc-400" /></div>
                      <div className="text-[10px] font-bold text-zinc-300 truncate">{o.delivery_address || 'No Address'}</div>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-1 mb-3">
                    {o.items?.map((it) => (
                      <div key={it.id} className="flex justify-between text-[10px] bg-black/20 p-2 rounded border border-zinc-900">
                        <span className="text-zinc-400"><b className="text-zinc-200">{it.quantity}x</b> {it.product_name}</span>
                        <span className="font-bold text-white">{money(it.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Toggle */}
                  <Button 
                    size="sm"
                    onClick={() => update.mutate({ id: o.id, payload: { payment_status: isPaid ? 'unpaid' : 'paid' } })}
                    className={`w-full h-8 text-[10px] font-black uppercase tracking-widest ${isPaid ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-600 text-white'}`}
                  >
                    <Wallet size={12} className="mr-2" />
                    {isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
                  </Button>
                </div>
              )}
              
              <button 
                onClick={() => setExpandedId(isExpanded ? null : o.id)}
                className="w-full flex justify-center py-1 bg-zinc-900/40 border-t border-zinc-900"
              >
                {isExpanded ? <ChevronUp size={12} className="text-zinc-600" /> : <ChevronDown size={12} className="text-zinc-600" />}
              </button>
            </Card>
          );
        })}
      </div>

      {/* EMPTY STATE */}
      {!query.isLoading && orders.length === 0 && (
        <div className="py-20 text-center">
          <Package size={40} className="mx-auto text-zinc-800 mb-2" />
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Antrian Kosong</p>
        </div>
      )}
    </div>
  );
}