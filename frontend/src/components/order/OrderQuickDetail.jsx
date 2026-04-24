import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline'

const statuses = [
  'pending',
  'confirmed',
  'delivering',
  'delivered',
  'cancelled',
  'refunded',
]

export default function OrderQuickDetail({ mode, orderId, orderNumber, onUpdated }) {
  const isStaff = mode === 'staff'
  const isPublic = mode === 'public'

  const orderQuery = useQuery({
    enabled: Boolean(orderId) || Boolean(orderNumber),
    queryKey: ['order-detail', mode, orderId ?? orderNumber],
    queryFn: async () => {
      if (isPublic) return (await api.get(`/orders/${orderNumber}`)).data.order
      return (await api.get(`/staff/orders/${orderId}`)).data.order
    },
  })

  const couriersQuery = useQuery({
    enabled: isStaff,
    queryKey: ['staff', 'couriers'],
    queryFn: async () => (await api.get('/staff/couriers')).data.couriers,
  })

  const update = useMutation({
    mutationFn: async (payload) => {
      if (!isStaff) return null
      return (await api.put(`/staff/orders/${orderId}`, payload)).data.order
    },
    onSuccess: () => {
      orderQuery.refetch()
      onUpdated?.()
    },
  })

  const assign = useMutation({
    mutationFn: async (courier_id) => {
      if (!isStaff) return null
      return (await api.put(`/staff/orders/${orderId}/assign-courier`, { courier_id })).data.order
    },
    onSuccess: () => {
      orderQuery.refetch()
      onUpdated?.()
    },
  })

  const order = orderQuery.data
  if (orderQuery.isLoading) return <div className="text-sm text-zinc-400">Loading...</div>
  if (orderQuery.isError || !order) return <div className="text-sm text-red-300">Failed to load order.</div>

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">{order.order_number}</div>
          <div className="flex items-center gap-2">
            <Badge>{order.payment_status}</Badge>
            <Badge>{order.status}</Badge>
          </div>
        </div>
        <div className="mt-3">
          <OrderStatusTimeline status={order.status} />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="text-sm text-zinc-400">Recipient</div>
        <div className="mt-1 text-sm text-zinc-200">
          {order.recipient_name} ({order.recipient_phone})
        </div>
        {order.gym ? (
          <>
            <div className="mt-3 text-sm text-zinc-400">Gym</div>
            <div className="mt-1 text-sm text-zinc-200">{order.gym.gym_name}</div>
          </>
        ) : null}
        <div className="mt-2 text-sm text-zinc-400">Address</div>
        <div className="mt-1 text-sm text-zinc-200">{order.delivery_address}</div>
        {order.delivery_notes ? <div className="mt-2 text-sm text-zinc-400">{order.delivery_notes}</div> : null}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="font-medium">Items</div>
        <div className="mt-3 space-y-2">
          {(order.items ?? []).map((it) => (
            <div key={it.id} className="flex flex-col gap-1 rounded border border-zinc-800 bg-zinc-950 p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-zinc-200">{it.product_name}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Rp {Number(it.product_price ?? 0).toLocaleString('id-ID')} × {it.quantity}
                  </div>
                </div>
                <div className="text-zinc-200 shrink-0">
                  Rp {Number(it.subtotal ?? 0).toLocaleString('id-ID')}
                </div>
              </div>
              {(it.modifier_options || it.modifiers)?.length > 0 && (
                <div className="pl-3 space-y-0.5">
                  {(it.modifier_options || it.modifiers).map((mod, mi) => (
                    <div key={mi} className="flex justify-between text-xs text-zinc-500">
                      <span>+ {mod.option_name || mod.modifier_name || mod.name}</span>
                      <span>
                        {Number(mod.additional_price ?? mod.price ?? 0) > 0
                          ? `+Rp ${Number(mod.additional_price ?? mod.price ?? 0).toLocaleString('id-ID')}`
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {it.notes && (
                <div className="text-xs text-amber-500/70 italic pl-3">
                  Note: {it.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="font-medium">Total</div>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <div>Subtotal</div>
            <div>Rp {Number(order.subtotal ?? 0).toLocaleString('id-ID')}</div>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <div>Delivery</div>
            <div>Rp {Number(order.delivery_fee ?? 0).toLocaleString('id-ID')}</div>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <div>Discount</div>
            <div>- Rp {Number(order.discount_amount ?? 0).toLocaleString('id-ID')}</div>
          </div>
          <div className="mt-2 flex items-center justify-between font-medium">
            <div>Total</div>
            <div>Rp {Number(order.total_amount ?? 0).toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>

      {isStaff ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="font-medium">Actions</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Select value={order.status} onValueChange={(v) => update.mutate({ status: v })}>
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

            <Select value={order.payment_status} onValueChange={(v) => update.mutate({ payment_status: v })}>
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

            <Select
              value={order.courier_id ? String(order.courier_id) : ''}
              onValueChange={(v) => assign.mutate(Number(v))}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Assign courier" />
              </SelectTrigger>
              <SelectContent>
                {(couriersQuery.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="button" size="sm" onClick={() => update.mutate({ status: 'confirmed' })} disabled={update.isPending}>
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => update.mutate({ payment_status: 'paid' })}
              disabled={update.isPending}
            >
              Mark Paid
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
