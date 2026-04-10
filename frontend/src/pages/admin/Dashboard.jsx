import { cloneElement, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { 
  TrendingUp, 
  Users, 
  Dumbbell, 
  Package, 
  ShoppingCart, 
  Download, 
  Calendar as CalendarIcon,
  ArrowUpRight,
  DollarSign,
  Wallet,
  Percent
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// Variabel Warna Accent
const COLORS = ['#22c55e', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#f97316', '#ef4444']

export default function Dashboard() {
  const now = useMemo(() => new Date(), [])
  const defaultFrom = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return d.toISOString().slice(0, 10)
  }, [now])
  const defaultTo = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const monthOptions = useMemo(() => {
    const out = []
    const base = new Date(now.getFullYear(), now.getMonth(), 1)
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      const f = new Date(y, m, 1).toISOString().slice(0, 10)
      const t = new Date(y, m + 1, 0).toISOString().slice(0, 10)
      out.push({ label, from: f, to: t, key: `${y}-${String(m + 1).padStart(2, '0')}` })
    }
    return out
  }, [now])

  const query = useQuery({
    queryKey: ['admin', 'dashboard', { from, to }],
    queryFn: async () => (await api.get('/admin/dashboard', { params: { from, to } })).data,
  })

  const { counts = {}, sales = {}, top_products: topProducts = [], top_trainers: topTrainers = [], top_members: topMembers = [] } = query.data ?? {}

  const baseUrl = useMemo(() => (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, ''), [])

  const chartData = useMemo(() => {
    return topProducts.map((p) => ({
      name: p.product_name,
      value: Number(p.qty_sold ?? 0),
    }))
  }, [topProducts])

  const money = (v) => `Rp ${Number(v ?? 0).toLocaleString('id-ID')}`

  const pie = useMemo(() => {
    const total = chartData.reduce((sum, s) => sum + (Number(s.value ?? 0) || 0), 0) || 0
    let acc = 0
    const stops = chartData
      .filter((s) => (Number(s.value ?? 0) || 0) > 0)
      .map((s, idx) => {
        const start = acc
        const end = acc + ((Number(s.value ?? 0) || 0) / total) * 100
        acc = end
        return `${COLORS[idx % COLORS.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`
      })
    return {
      total,
      conic: stops.length ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#27272a 0 100%)',
    }
  }, [chartData])

  async function downloadReport(type) {
    const res = await api.get('/admin/reports/orders-export', {
      params: { from, to, type },
      responseType: 'blob',
    })
    const cd = res.headers?.['content-disposition'] ?? ''
    const m = /filename="?([^"]+)"?/i.exec(cd)
    const filename = m?.[1] ?? `report-${type}-${from}-to-${to}.csv`
    const url = window.URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen space-y-8 p-4 md:p-8 bg-zinc-950 text-zinc-50">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Overview</h1>
          <p className="text-zinc-400">Monitoring performa bisnis Anda secara real-time.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2 px-3">
            <CalendarIcon className="h-4 w-4 text-indigo-400" />
            <select
              className="h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-sm text-zinc-200"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value
                const opt = monthOptions.find((m) => m.key === v)
                if (!opt) return
                setFrom(opt.from)
                setTo(opt.to)
                e.target.value = ''
              }}
            >
              <option value="">Quick month…</option>
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <Input 
              type="date" 
              value={from} 
              onChange={(e) => setFrom(e.target.value)} 
              className="h-9 w-[140px] border-none bg-transparent focus-visible:ring-0 text-sm" 
            />
            <span className="text-zinc-600">→</span>
            <Input 
              type="date" 
              value={to} 
              onChange={(e) => setTo(e.target.value)} 
              className="h-9 w-[140px] border-none bg-transparent focus-visible:ring-0 text-sm" 
            />
          </div>

          <div className="flex gap-2 ml-2">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-800 text-zinc-200"
              onClick={() => {
                const t = new Date().toISOString().slice(0, 10)
                setFrom(t)
                setTo(t)
              }}
            >
              Hari ini
            </Button>
            <Button size="sm" onClick={() => downloadReport('orders')} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* PRIMARY STATS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Net Sales" 
          value={money(sales.net_sales)} 
          subValue={`${sales.orders_paid ?? 0} Orders Paid`}
          icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
          trend="+12.5%" // Contoh statik, bisa dihitung dinamis jika ada data period sebelumnya
        />
        <StatCard 
          title="Net Profit" 
          value={money(sales.net_profit)} 
          subValue="After COGS"
          icon={<TrendingUp className="h-5 w-5 text-indigo-400" />}
          trend="+8.2%"
        />
        <StatCard 
          title="Total Collected" 
          value={money(sales.total_collected)} 
          subValue="Inc. Delivery Fees"
          icon={<Wallet className="h-5 w-5 text-amber-400" />}
        />
        <StatCard 
          title="Discounts" 
          value={money(sales.discounts)} 
          subValue="Promo & Vouchers"
          icon={<Percent className="h-5 w-5 text-red-400" />}
        />
      </div>

      {/* QUICK COUNTS */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { key: 'users', label: 'Users', icon: <Users />, to: '/admin/users', color: 'text-blue-400' },
          { key: 'trainers', label: 'Trainers', icon: <Dumbbell />, to: '/admin/trainers', color: 'text-purple-400' },
          { key: 'members', label: 'Members', icon: <Users />, to: '/admin/members', color: 'text-emerald-400' },
          { key: 'products', label: 'Products', icon: <Package />, to: '/admin/products', color: 'text-orange-400' },
          { key: 'orders', label: 'Orders', icon: <ShoppingCart />, to: '/admin/orders', color: 'text-rose-400' },
        ].map((c) => (
          <Link key={c.key} to={c.to} className="group transition-all hover:-translate-y-1">
            <Card className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={`p-2 rounded-lg bg-zinc-950 mb-2 ${c.color}`}>
                  {cloneElement(c.icon, { size: 18 })}
                </div>
                <div className="text-2xl font-bold">{counts[c.key] ?? 0}</div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{c.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* VISUALIZATION SECTION */}
      <div className="grid gap-6 lg:grid-cols-7">
        
        {/* Top Products Chart & Table */}
        <Card className="lg:col-span-4 bg-zinc-900/40 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Performance Products</CardTitle>
              <CardDescription>Produk paling banyak diminati periode ini</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="border-zinc-700">
              <Link to="/admin/products">Analytics</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex w-full justify-center md:w-1/2">
                <div className="h-[200px] w-[200px] rounded-full border border-zinc-800 bg-zinc-950" style={{ background: pie.conic }} />
              </div>
              <div className="w-full md:w-1/2 space-y-2">
                {chartData.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                      <span className="text-zinc-300 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-medium text-zinc-100">{item.value} Units</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <Table>
                <TableHeader className="bg-zinc-950/50">
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Product</TableHead>
                    <TableHead className="text-right text-zinc-400">Sold</TableHead>
                    <TableHead className="text-right text-zinc-400">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.slice(0, 4).map((p) => (
                    <TableRow key={p.product_id} className="border-zinc-800 hover:bg-zinc-800/30">
                      <TableCell className="font-medium text-zinc-200">
                        <div className="flex items-center gap-3">
                          <img 
                            src={p.product_image ? (p.product_image.startsWith('uploads/') ? `${baseUrl}/${p.product_image}` : `${baseUrl}/storage/${p.product_image}`) : '/placeholder.png'} 
                            className="h-8 w-8 rounded-md object-cover border border-zinc-700" 
                          />
                          {p.product_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{p.qty_sold}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-400">{money(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* PT Leaderboard */}
        <Card className="lg:col-span-3 bg-zinc-900/40 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>PT Leaderboard</CardTitle>
              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                Top 5 Trainers
              </Badge>
            </div>
            <CardDescription>Peringkat pelatih berdasarkan total poin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topTrainers.map((t, idx) => (
                <div key={t.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400 border border-zinc-700 group-hover:border-indigo-500 transition-colors">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none text-zinc-100">{t.full_name}</p>
                      <p className="text-xs text-zinc-500">@{t.username} • {t.tier}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-400">{Number(t.total_points).toLocaleString()} pts</p>
                  </div>
                </div>
              ))}
              {!topTrainers.length && <div className="text-center py-10 text-zinc-500 text-sm italic">No trainer data available.</div>}
            </div>
            <Button variant="ghost" className="w-full mt-6 text-zinc-400 hover:text-zinc-100 border border-dashed border-zinc-700" asChild>
              <Link to="/admin/trainers" className="text-xs">Full Leaderboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* TOP MEMBERS */}
      <Card className="bg-zinc-900/40 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Members</CardTitle>
            <CardDescription>Member dengan pembelian terbanyak pada periode ini</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="border-zinc-700">
            <Link to="/admin/members">Lihat semua</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-400">Member</TableHead>
                <TableHead className="text-right text-zinc-400">Items</TableHead>
                <TableHead className="text-right text-zinc-400">Orders</TableHead>
                <TableHead className="text-right text-zinc-400">Total Purchase</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topMembers.slice(0, 8).map((m) => (
                <TableRow key={m.member_id} className="border-zinc-800 hover:bg-zinc-800/30">
                  <TableCell className="font-medium text-zinc-200">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                        {m.avatar ? (
                          <img
                            src={m.avatar.startsWith('uploads/') ? `${baseUrl}/${m.avatar}` : `${baseUrl}/storage/${m.avatar}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate">{m.full_name}</div>
                        <div className="text-xs text-zinc-500 truncate">{m.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{Number(m.items_count ?? 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right">{Number(m.orders_count ?? 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-400">{money(m.total_purchase)}</TableCell>
                </TableRow>
              ))}
              {!topMembers.length ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={4} className="text-center py-10 text-zinc-500 text-sm italic">
                    No member data available.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {query.isLoading && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm animate-pulse">
           Updating data...
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, subValue, icon, trend }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {title}
        </CardTitle>
        <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-100">{value}</div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-zinc-500">{subValue}</p>
          {trend && (
            <span className="flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
              <ArrowUpRight className="h-3 w-3 mr-0.5" /> {trend}
            </span>
          )}
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-zinc-700/20 to-transparent" />
    </Card>
  )
}
