import { useEffect, useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Phone,
  MoreVertical,
  ExternalLink,
  RefreshCw,
  CreditCard
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEcho } from '@/components/common/RealtimeProvider'
import SidePanel from '@/components/common/SidePanel'
import OrderQuickDetail from '@/components/order/OrderQuickDetail'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle2 },
  delivering: { label: 'Delivering', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Package },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: RefreshCw },
}

function titleCase(s) {
  const v = String(s ?? '').trim()
  if (!v) return '-'
  return v
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
}

export default function Orders() {
  const echo = useEcho()
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const query = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => (await api.get('/admin/orders')).data,
  })

  const paymentMethodsQuery = useQuery({
    queryKey: ['admin', 'payment-methods'],
    queryFn: async () => (await api.get('/admin/payment-methods')).data,
  })

  const paymentMethodByCode = useMemo(() => {
    const list = paymentMethodsQuery.data?.data ?? []
    const map = {}
    for (const m of list) {
      if (m?.code) map[m.code] = m
    }
    return map
  }, [paymentMethodsQuery.data])

  const update = useMutation({
    mutationFn: async ({ id, payload }) => (await api.put(`/admin/orders/${id}/status`, payload)).data.order,
    onSuccess: () => {
      query.refetch()
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })

  // Realtime updates
  useEffect(() => {
    if (!echo) return
    const channel = echo.private('staff.orders')
    channel.listen('.OrderQueueUpdated', () => {
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
    })
    return () => echo.leave('staff.orders')
  }, [echo, qc])

  const filteredOrders = useMemo(() => {
    let data = query.data?.data ?? []
    if (filterStatus !== 'all') {
      data = data.filter(o => o.status === filterStatus)
    }
    if (search) {
      const s = search.toLowerCase()
      data = data.filter(o =>
        o.order_number.toLowerCase().includes(s) ||
        o.recipient_name.toLowerCase().includes(s)
      )
    }
    return data
  }, [query.data, search, filterStatus])

  return (
    <div className="min-h-screen space-y-6 pb-20">
      {/* HEADER & ANALYTICS RINGKAS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Order Management</h1>
          <p className="text-zinc-400 text-sm">Kelola dan pantau semua pesanan masuk secara realtime.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => query.refetch()} className="border-zinc-800 bg-zinc-900">
            <RefreshCw className={`h-4 w-4 mr-2 ${query.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="sticky top-0 z-10 flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 backdrop-blur-md md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Cari Order ID atau Nama Pelanggan..."
            className="pl-10 bg-zinc-900 border-zinc-800 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'delivering', label: 'Shipping' },
            { key: 'delivered', label: 'Done' },
          ].map((t) => (
            <Button
              key={t.key}
              type="button"
              size="sm"
              variant="secondary"
              className={[
                'h-9 text-xs font-bold uppercase',
                filterStatus === t.key ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : '',
              ].join(' ')}
              onClick={() => setFilterStatus(t.key)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="grid gap-4">
        {filteredOrders.map((o) => {
          const StatusIcon = STATUS_CONFIG[o.status]?.icon ?? Clock
          const pm = o.payment_method ? paymentMethodByCode[o.payment_method] : null
          const paymentMethodLabel = pm?.name ?? titleCase(o.payment_method)
          return (
            <div
              key={o.id}
              className="group relative flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-all hover:border-zinc-600 hover:bg-zinc-900/60 md:flex-row md:items-center"
            >
              {/* Status Indicator Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${o.status === 'pending' ? 'bg-zinc-600' : 'bg-indigo-600'}`} />

              {/* Order Info */}
              <div className="flex-1 space-y-1" onClick={() => setSelected(o)}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-zinc-100">{o.order_number}</span>
                  <Badge className={`${STATUS_CONFIG[o.status]?.color} border font-medium`}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {o.status.toUpperCase()}
                  </Badge>
                  {o.payment_status === 'paid' ? (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5">PAID</Badge>
                  ) : (
                    <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/5 uppercase">{o.payment_status}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  {o.recipient_name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <CreditCard className="h-3 w-3" />
                  <span className="truncate">{paymentMethodLabel}</span>
                </div>
                <div className="flex flex-col gap-1 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> {o.recipient_phone}
                  </div>
                  <div className="flex items-center gap-1.5 truncate max-w-md">
                    <MapPin className="h-3 w-3" /> {o.delivery_address}
                  </div>
                </div>
              </div>

              {/* Quick Actions & Price */}
              <div className="flex flex-wrap items-center gap-4 border-t border-zinc-800 pt-4 md:border-none md:pt-0">
                <div className="flex flex-col items-end mr-4">
                  <span className="text-xs text-zinc-500">Total Amount</span>
                  <span className="text-lg font-bold text-indigo-400">
                    Rp {Number(o.total_amount ?? 0).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={o.status}
                    onValueChange={(v) => update.mutate({ id: o.id, payload: { status: v } })}
                  >
                    <SelectTrigger className="h-9 w-[130px] bg-zinc-950 border-zinc-800 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {Object.keys(STATUS_CONFIG).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize focus:bg-zinc-800">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 border border-zinc-800"
                    onClick={() => setSelected(o)}
                    aria-label="View Detail"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <a
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                    href={`tel:${o.recipient_phone ?? ''}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Call Customer"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          )
        })}

        {filteredOrders.length === 0 && !query.isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p>Tidak ada pesanan yang ditemukan</p>
          </div>
        )}

        {query.isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 w-full animate-pulse rounded-xl bg-zinc-900/50 border border-zinc-800" />
            ))}
          </div>
        )}
      </div>

      <SidePanel
        open={Boolean(selected)}
        title={selected ? `Order Detail #${selected.order_number}` : 'Order Detail'}
        onClose={() => setSelected(null)}
      >
        <div className="px-1">
          {selected && (
            <OrderQuickDetail
              mode="staff"
              orderId={selected.id}
              onUpdated={() => {
                query.refetch()
                qc.invalidateQueries({ queryKey: ['admin', 'orders'] })
              }}
            />
          )}
        </div>
      </SidePanel>
    </div>
  )
}
