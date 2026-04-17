import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import OrderCard from '@/components/order/OrderCard'
import SidePanel from '@/components/common/SidePanel'
import OrderQuickDetail from '@/components/order/OrderQuickDetail'
import { ShoppingBag, Loader2, AlertTriangle, PackageSearch } from 'lucide-react'

export default function Orders() {
  const [selected, setSelected] = useState(null)
  const query = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get('/orders')).data,
  })

  const orders = query.data?.data ?? []
  const glowForStatus = (status) => {
    const s = String(status ?? '').toLowerCase()
    if (s === 'pending') return 'from-amber-500/25 to-transparent'
    if (s === 'confirmed') return 'from-blue-500/25 to-transparent'
    if (s === 'delivering') return 'from-purple-500/25 to-transparent'
    if (s === 'delivered') return 'from-emerald-500/25 to-transparent'
    if (s === 'cancelled') return 'from-rose-500/25 to-transparent'
    if (s === 'refunded') return 'from-zinc-500/25 to-transparent'
    return 'from-[var(--accent)]/20 to-transparent'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-2 border-b border-zinc-900 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-[var(--accent)]/10">
            <ShoppingBag size={16} className="text-[var(--accent)]" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            Customer Portal
          </span>
        </div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
          My <span className="text-zinc-500">Orders</span>
        </h1>
        <p className="text-xs font-medium text-zinc-500 max-w-md">
          Lacak status pesanan dan riwayat transaksi Anda secara real-time.
        </p>
      </div>

      {/* CONTENT GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {orders.map((o) => (
          <div 
            key={o.id} 
            onClick={() => setSelected(o)} 
            className="group relative cursor-pointer transition-all duration-300 hover:scale-[1.01]"
          >
            {/* Overlay glow effect on hover */}
            <div className={['absolute -inset-0.5 bg-gradient-to-r rounded-[2rem] opacity-0 group-hover:opacity-100 transition duration-500 blur-sm', glowForStatus(o.status)].join(' ')} />
            
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
            <div key={i} className="h-32 w-full rounded-[2rem] bg-zinc-900/50 animate-pulse border border-zinc-800" />
          ))}
          <div className="col-span-full flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="animate-spin text-zinc-700" size={32} />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Retrieving Orders...</span>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {query.isError && (
        <div className="flex flex-col items-center justify-center py-20 rounded-[2.5rem] border border-rose-500/20 bg-rose-500/5 text-center">
          <AlertTriangle className="text-rose-500 mb-4" size={40} />
          <h3 className="text-lg font-black text-white uppercase italic tracking-tight">System Error</h3>
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
          <h3 className="text-xl font-black text-white uppercase italic tracking-tight">No Orders Found</h3>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-2">
            Anda belum memiliki riwayat pesanan.
          </p>
        </div>
      )}

      {/* SIDE PANEL DETAIL */}
      <SidePanel
        open={Boolean(selected)}
        title={
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">Order Details</span>
            <span className="text-xl font-black italic uppercase tracking-tighter">
              {selected ? `#${selected.order_number}` : 'Order'}
            </span>
          </div>
        }
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="mt-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <OrderQuickDetail mode="public" orderNumber={selected.order_number} />
          </div>
        ) : null}
      </SidePanel>
    </div>
  )
}
