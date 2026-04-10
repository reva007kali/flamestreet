import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEcho } from '@/components/common/RealtimeProvider'
import { playNotifySound } from '@/lib/notifySound'
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

export default function Queue() {
  const echo = useEcho()
  const qc = useQueryClient()
  const previousRef = useRef({ ids: [], statuses: new Map() })
  const [liveMessage, setLiveMessage] = useState('')
  const [selected, setSelected] = useState(null)
  const couriersQuery = useQuery({
    queryKey: ['staff', 'couriers'],
    queryFn: async () => (await api.get('/staff/couriers')).data.couriers,
  })

  const query = useQuery({
    queryKey: ['staff', 'orders', { status: 'queue' }],
    queryFn: async () => (await api.get('/staff/orders', { params: { status: 'queue' } })).data,
    refetchInterval: 3000,
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

  const assign = useMutation({
    mutationFn: async ({ id, courier_id }) =>
      (await api.put(`/staff/orders/${id}/assign-courier`, { courier_id })).data.order,
    onMutate: async ({ id, courier_id }) => {
      qc.setQueriesData({ queryKey: ['staff', 'orders'] }, (old) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((o) => (o.id === id ? { ...o, courier_id } : o)),
        }
      })
    },
    onSuccess: () => query.refetch(),
  })

  const orders = query.data?.data ?? []
  const couriers = couriersQuery.data ?? []

  useEffect(() => {
    if (!orders.length) {
      previousRef.current = { ids: [], statuses: new Map() }
      return
    }

    const prevIds = previousRef.current.ids
    const prevStatuses = previousRef.current.statuses
    const nextIds = orders.map((o) => o.id)
    const nextStatuses = new Map(orders.map((o) => [o.id, `${o.status}|${o.payment_status}`]))

    const newOrder = orders.find((o) => !prevIds.includes(o.id))
    if (newOrder && prevIds.length) {
      setLiveMessage(`Order baru masuk: ${newOrder.order_number}`)
      playNotifySound('default')
    } else {
      const changed = orders.find((o) => prevStatuses.has(o.id) && prevStatuses.get(o.id) !== `${o.status}|${o.payment_status}`)
      if (changed) {
        setLiveMessage(`Order ${changed.order_number} diperbarui`)
        playNotifySound('status')
      }
    }

    previousRef.current = { ids: nextIds, statuses: nextStatuses }
  }, [orders])

  useEffect(() => {
    if (!liveMessage) return
    const timer = window.setTimeout(() => setLiveMessage(''), 2500)
    return () => window.clearTimeout(timer)
  }, [liveMessage])

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Order Queue</h1>
      {liveMessage ? (
        <div className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--accent)]">
          {liveMessage}
        </div>
      ) : null}

      <div className="space-y-3">
        {orders.map((o) => (
          <Card key={o.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                <button type="button" className="hover:text-[var(--accent)]" onClick={() => setSelected(o)}>
                  {o.order_number}
                </button>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge>{o.payment_status}</Badge>
                <div className="text-sm text-zinc-400">
                  Rp {Number(o.total_amount ?? 0).toLocaleString('id-ID')}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <div className="w-full text-xs text-zinc-500">
                {o.recipient_name} • {o.recipient_phone}
              </div>
              <Select
                value={o.status}
                onValueChange={(v) => update.mutate({ id: o.id, payload: { status: v } })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['unpaid', 'paid', 'refunded'].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={o.courier_id ? String(o.courier_id) : ''}
                onValueChange={(v) => assign.mutate({ id: o.id, courier_id: Number(v) })}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Assign courier" />
                </SelectTrigger>
                <SelectContent>
                  {couriers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                size="sm"
                onClick={() => update.mutate({ id: o.id, payload: { status: 'confirmed' } })}
                disabled={update.isPending}
              >
                Confirm
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => update.mutate({ id: o.id, payload: { payment_status: 'paid' } })}
                disabled={update.isPending}
              >
                Mark Paid
              </Button>
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
