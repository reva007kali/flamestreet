import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar as CalendarIcon, ChevronRight, ListOrdered, ReceiptText, ArrowUpRight, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const pad2 = (n) => String(n).padStart(2, '0')
  const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const today = useMemo(() => toYmd(new Date()), [])
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)

  const countsQuery = useQuery({
    queryKey: ['staff', 'orders', 'counts'],
    queryFn: async () => (await api.get('/staff/orders/counts')).data?.counts ?? {},
    refetchInterval: 4000,
  })

  const dashboardQuery = useQuery({
    queryKey: ['staff', 'dashboard', { from, to }],
    queryFn: async () => (await api.get('/staff/dashboard', { params: { from, to } })).data,
  })

  const queueQuery = useQuery({
    queryKey: ['staff', 'orders', { status: 'queue', limit: 5 }],
    queryFn: async () => (await api.get('/staff/orders', { params: { status: 'queue' } })).data,
    refetchInterval: 4000,
  })

  const counts = countsQuery.data ?? {}
  const sales = dashboardQuery.data?.sales ?? {}
  const itemsSold = dashboardQuery.data?.items_sold ?? []
  const orders = (queueQuery.data?.data ?? []).slice(0, 4)
  const money = (v) => `Rp ${Number(v ?? 0).toLocaleString('id-ID')}`

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase italic leading-none">CASHIER</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Operational Summary</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
           <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-zinc-400 outline-none w-20"
            />
            <ChevronRight size={10} className="text-zinc-700" />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-zinc-400 outline-none w-20"
            />
        </div>
      </div>

      {/* STATS GRID - 2 Columns on Mobile */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-zinc-950 border-zinc-800/60 shadow-sm overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="p-1 rounded bg-emerald-500/10">
                <TrendingUp size={12} className="text-emerald-500" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Revenue</span>
            </div>
            <div className="text-sm font-black text-white truncate">{money(sales.total_collected)}</div>
            <div className="text-[9px] font-bold text-emerald-500/80 mt-0.5">{sales.orders_paid ?? 0} Paid</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800/60 shadow-sm overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="p-1 rounded bg-orange-500/10">
                <ListOrdered size={12} className="text-orange-500" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">Queue</span>
            </div>
            <div className="text-sm font-black text-white">{counts.queue_total ?? 0} <span className="text-[10px] text-zinc-500 font-medium">Orders</span></div>
            <div className="text-[9px] font-bold text-orange-500/80 mt-0.5">{counts.queue_unpaid ?? 0} Unpaid</div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTIONS - Grid of Mini Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/cashier/queue">
          <Button variant="outline" className="w-full h-10 bg-zinc-900/40 border-zinc-800 text-[11px] font-bold uppercase tracking-tighter gap-2 justify-start px-3">
            <div className="bg-[var(--accent)] p-1 rounded-sm text-black">
              <ListOrdered size={12} />
            </div>
            Antrian
          </Button>
        </Link>
        <Link to="/cashier/orders">
          <Button variant="outline" className="w-full h-10 bg-zinc-900/40 border-zinc-800 text-[11px] font-bold uppercase tracking-tighter gap-2 justify-start px-3">
            <div className="bg-zinc-800 p-1 rounded-sm text-zinc-400">
              <ReceiptText size={12} />
            </div>
            Riwayat
          </Button>
        </Link>
      </div>

      {/* LATEST QUEUE - Compact List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Antrian Terbaru</h2>
          <Button variant="link" className="h-auto p-0 text-[10px] text-[var(--accent)] font-bold uppercase">Semua</Button>
        </div>
        <div className="grid gap-1.5">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/20 p-2.5">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-white leading-none">#{o.order_number}</span>
                <span className="text-[10px] text-zinc-500 font-medium mt-1 truncate max-w-[120px]">{o.recipient_name}</span>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-black text-white leading-none">{money(o.total_amount)}</div>
                <Badge variant="outline" className={`mt-1 h-4 px-1.5 text-[8px] uppercase font-black ${o.payment_status === 'paid' ? 'border-emerald-900 text-emerald-500' : 'border-orange-900 text-orange-500'}`}>
                  {o.payment_status}
                </Badge>
              </div>
            </div>
          ))}
          {!queueQuery.isLoading && !orders.length && (
             <div className="text-[10px] text-center py-4 font-bold text-zinc-600 uppercase tracking-widest">Kosong</div>
          )}
        </div>
      </div>

      {/* ITEMS SOLD - Tight Table */}
      <Card className="bg-zinc-950 border-zinc-800/60 shadow-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-900 bg-zinc-900/30 flex justify-between items-center">
           <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Top Selling</h2>
           <TrendingUp size={12} className="text-zinc-700" />
        </div>
        <Table>
          <TableBody>
            {itemsSold.slice(0, 5).map((it) => (
              <TableRow key={`${it.product_id}-${it.product_name}`} className="border-zinc-900 hover:bg-zinc-900/20 px-0">
                <TableCell className="py-2 px-3">
                  <div className="text-[11px] font-bold text-zinc-200 leading-tight">{it.product_name}</div>
                  <div className="text-[9px] text-zinc-500">{it.qty_sold} terjual</div>
                </TableCell>
                <TableCell className="py-2 px-3 text-right">
                  <div className="text-[11px] font-black tabular-nums text-emerald-400">
                    {money(it.revenue)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {itemsSold.length > 5 && (
          <div className="p-2 border-t border-zinc-900 bg-zinc-900/10 text-center">
             <button className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Lihat Semua Item</button>
          </div>
        )}
      </Card>
    </div>
  )
}
