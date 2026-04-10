import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/axios'
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DeliveryDetail() {
  const { orderNumber } = useParams()

  const orderQuery = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: async () => (await api.get(`/orders/${orderNumber}`)).data.order,
  })

  const updateStatus = useMutation({
    mutationFn: async (status) =>
      (await api.put(`/courier/deliveries/${orderQuery.data.id}/status`, { status })).data.order,
    onSuccess: () => orderQuery.refetch(),
  })

  if (orderQuery.isLoading) return <div className="text-zinc-400">Loading...</div>
  if (orderQuery.isError) return <div className="text-red-300">Failed to load delivery.</div>

  const order = orderQuery.data

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">{order.order_number}</CardTitle>
          <Badge>{order.status}</Badge>
        </CardHeader>
        <CardContent>
          <OrderStatusTimeline status={order.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Update Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {['delivering', 'delivered'].map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              onClick={() => updateStatus.mutate(s)}
              disabled={updateStatus.isPending}
            >
              {s}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Delivery</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-300">{order.delivery_address}</div>
          <div className="mt-3 text-sm text-zinc-400">
            Recipient: {order.recipient_name} ({order.recipient_phone})
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
