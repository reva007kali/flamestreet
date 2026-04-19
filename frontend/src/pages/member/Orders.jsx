import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import OrderCard from "@/components/order/OrderCard";
import {
  ShoppingBag,
  Loader2,
  AlertTriangle,
  PackageSearch,
} from "lucide-react";

export default function Orders() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await api.get("/orders")).data,
  });

  const orders = query.data?.data ?? [];
  const glowForStatus = (status) => {
    const s = String(status ?? "").toLowerCase();
    if (s === "pending") return "from-amber-500/25 to-transparent";
    if (s === "confirmed") return "from-blue-500/25 to-transparent";
    if (s === "delivering") return "from-purple-500/25 to-transparent";
    if (s === "delivered") return "from-emerald-900 to-black/80";
    if (s === "cancelled") return "from-rose-500/25 to-transparent";
    if (s === "refunded") return "from-zinc-500/25 to-transparent";
    return "from-emerald-900 to-black/80";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-2 border-b border-zinc-900 my-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-emerald-600/10">
            <ShoppingBag size={16} className="text-emerald-600" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            Lacak status pesanan dan riwayat transaksi Anda secara real-time.
          </span>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {orders.map((o) => (
          <div
            key={o.id}
            onClick={() => navigate(`/orders/${o.order_number}`)}
            className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.01]"
          >
            {/* Overlay glow effect on hover */}
            <div
              className={[
                "absolute -inset-0.5 bg-linear-to-br rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur-sm",
                glowForStatus(o.status),
              ].join(" ")}
            />

            <div className="relative">
              <OrderCard order={o} />
            </div>
          </div>
        ))}
      </div>

      {/* LOADING STATE */}
      {query.isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 w-full rounded-[2rem] bg-zinc-900/50 animate-pulse border border-zinc-800"
            />
          ))}
          <div className="col-span-full flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="animate-spin text-zinc-700" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
              Retrieving Orders...
            </span>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {query.isError && (
        <div className="flex flex-col items-center justify-center py-20 rounded-[2.5rem] border border-rose-500/20 bg-rose-500/5 text-center">
          <AlertTriangle className="text-rose-500 mb-4" size={40} />
          <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
            System Error
          </h3>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">
            Gagal memuat data pesanan. Silakan coba lagi nanti.
          </p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!query.isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 rounded-[3rem] border-2 border-dashed border-zinc-900 bg-zinc-950/30 text-center">
          <div className="h-20 w-20 rounded-full bg-zinc-900/50 flex items-center justify-center mb-6 border border-zinc-800">
            <PackageSearch className="h-8 w-8 text-zinc-700" />
          </div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
            No Orders Found
          </h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-2">
            Anda belum memiliki riwayat pesanan.
          </p>
        </div>
      )}
    </div>
  );
}
