import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import OrderCard from '@/components/order/OrderCard'
import SidePanel from '@/components/common/SidePanel'
import OrderQuickDetail from '@/components/order/OrderQuickDetail'

export default function Orders() {
  const [selected, setSelected] = useState(null)
  const query = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get('/orders')).data,
  })

  const orders = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Orders</h1>

      <div className="grid gap-3 md:grid-cols-2">
        {orders.map((o) => (
          <div key={o.id} onClick={() => setSelected(o)} className="cursor-pointer">
            <OrderCard order={o} />
          </div>
        ))}
        {query.isLoading ? <div className="text-sm text-zinc-400">Loading...</div> : null}
        {query.isError ? <div className="text-sm text-red-300">Failed to load orders.</div> : null}
      </div>

      <SidePanel
        open={Boolean(selected)}
        title={selected ? `Order ${selected.order_number}` : 'Order'}
        onClose={() => setSelected(null)}
      >
        {selected ? <OrderQuickDetail mode="public" orderNumber={selected.order_number} /> : null}
      </SidePanel>
    </div>
  )
}
