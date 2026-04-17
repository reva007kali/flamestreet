import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar as CalendarIcon, ChevronRight, ListOrdered, ReceiptText } from 'lucide-react'

export default function Dashboard() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
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
  const orders = (queueQuery.data?.data ?? []).slice(0, 5)
  const money = (v) => `Rp ${Number(v ?? 0).toLocaleString('id-ID')}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--accent)] font-bold tracking-tighter uppercase text-sm italic">
            <CalendarIcon size={16} /> Cashier
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic">Dashboard</h1>
          <p className="text-zinc-500 text-sm font-medium">Ringkasan operasional kasir.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setFrom(today)
              setTo(today)
            }}
            className="bg-zinc-950 text-zinc-200 hover:bg-zinc-900 rounded-xl font-black text-[11px] uppercase tracking-widest px-4 h-9 border border-zinc-800"
          >
            Hari Ini
          </Button>
          <div className="flex items-center gap-2 px-1">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="bg-transparent text-xs font-bold text-zinc-400 outline-none"
            />
            <ChevronRight size={12} className="text-zinc-700" />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="bg-transparent text-xs font-bold text-zinc-400 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-950 border-zinc-800/60 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
              <ReceiptText size={14} className="text-[var(--accent)]" /> Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-2xl font-black text-white tabular-nums tracking-tighter">
              {money(sales.total_collected)}
            </div>
            <div className="mt-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
              {Number(sales.orders_paid ?? 0).toLocaleString('id-ID')} order paid
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800/60 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
              <ListOrdered size={14} className="text-[var(--accent)]" /> Queue Total
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="text-3xl font-black text-white tabular-nums tracking-tighter">
              {Number(counts.queue_total ?? 0).toLocaleString('id-ID')}
            </div>
            <div className="mt-2">
              <Badge className="bg-zinc-900/60 text-zinc-300 border-zinc-800">
                Unpaid: {Number(counts.queue_unpaid ?? 0).toLocaleString('id-ID')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800/60 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
              <ListOrdered size={14} className="text-[var(--accent)]" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 flex flex-col gap-2">
            <Link to="/cashier/queue">
              <Button type="button" className="w-full justify-start gap-2">
                <ListOrdered className="h-4 w-4" /> Buka Antrian
              </Button>
            </Link>
            <Link to="/cashier/orders">
              <Button type="button" variant="secondary" className="w-full justify-start gap-2">
                <ReceiptText className="h-4 w-4" /> Lihat Orders
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800/60 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
              <ReceiptText size={14} className="text-[var(--accent)]" /> Latest Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/20 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{o.order_number}</div>
                  <div className="truncate text-[11px] text-zinc-500">
                    {o.recipient_name} • Rp {Number(o.total_amount ?? 0).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-3">
                  <Badge className="bg-zinc-900/60 text-zinc-300 border-zinc-800">{o.payment_status}</Badge>
                </div>
              </div>
            ))}
            {!queueQuery.isLoading && !orders.length ? (
              <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest">Queue kosong.</div>
            ) : null}
            {queueQuery.isLoading ? <div className="text-sm text-zinc-400">Loading...</div> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-950 border-zinc-800/60 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-zinc-900">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Items Terjual (Paid)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-900/30">
              <TableRow className="border-zinc-800">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Item
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">
                  Qty
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">
                  Revenue
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsSold.slice(0, 30).map((it) => (
                <TableRow key={`${it.product_id}-${it.product_name}`} className="border-zinc-900 hover:bg-zinc-900/20">
                  <TableCell className="font-semibold text-zinc-200">{it.product_name}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-zinc-300">
                    {Number(it.qty_sold ?? 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right font-black tabular-nums text-emerald-400">
                    {money(it.revenue)}
                  </TableCell>
                </TableRow>
              ))}
              {!dashboardQuery.isLoading && itemsSold.length === 0 ? (
                <TableRow className="border-zinc-900">
                  <TableCell colSpan={3} className="py-10 text-center text-xs font-bold text-zinc-600 uppercase tracking-widest">
                    Belum ada penjualan paid di range ini.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {dashboardQuery.isLoading ? (
            <div className="p-4 text-sm text-zinc-400">Loading...</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
