import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEcho } from '@/components/common/RealtimeProvider'
import SidePanel from '@/components/common/SidePanel'
import OrderQuickDetail from '@/components/order/OrderQuickDetail'

const statuses = [
  'pending',
  'confirmed',
  'delivering',
  'delivered',
  'cancelled',
  'refunded',
]

export default function Orders() {
  const echo = useEcho()
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const query = useQuery({
    queryKey: ['staff', 'orders', { all: true }],
    queryFn: async () => (await api.get('/staff/orders')).data,
    refetchInterval: 5000,
  })

  const update = useMutation({
    mutationFn: async ({ id, payload }) => (await api.put(`/staff/orders/${id}`, payload)).data.order,
    onMutate: async ({ id, payload }) => {
      qc.setQueriesData({ queryKey: ['staff', 'orders'] }, (old) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((o) => (o.id === id ? { ...o, ...payload } : o)),
        }
      })
    },
    onSuccess: () => query.refetch(),
  })

  useEffect(() => {
    if (!echo) return
    const channel = echo.private('staff.orders')
    channel.listen('.OrderQueueUpdated', () => {
      qc.invalidateQueries({ queryKey: ['staff', 'orders'] })
    })
    return () => {
      echo.leave('staff.orders')
    }
  }, [echo, qc])

  const orders = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Orders</h1>

      <div className="grid gap-3 md:grid-cols-2">
        {orders.map((o) => (
          <Card key={o.id} className="cursor-pointer hover:border-zinc-700" onClick={() => setSelected(o)}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {o.order_number}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge>{o.payment_status}</Badge>
                <Badge>{o.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-zinc-400">
                Rp {Number(o.total_amount ?? 0).toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-zinc-500">
                {o.recipient_name} • {o.recipient_phone}
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={o.status}
                  onValueChange={(v) => update.mutate({ id: o.id, payload: { status: v } })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={o.payment_status}
                  onValueChange={(v) => update.mutate({ id: o.id, payload: { payment_status: v } })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    {['unpaid', 'paid', 'refunded'].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {query.isLoading ? <div className="text-sm text-zinc-400">Loading...</div> : null}
      </div>

      <SidePanel
        open={Boolean(selected)}
        title={selected ? `Order ${selected.order_number}` : 'Order'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <OrderQuickDetail
            mode="staff"
            orderId={selected.id}
            onUpdated={() => {
              query.refetch()
              qc.invalidateQueries({ queryKey: ['staff', 'orders'] })
            }}
          />
        ) : null}
      </SidePanel>
    </div>
  )
}
