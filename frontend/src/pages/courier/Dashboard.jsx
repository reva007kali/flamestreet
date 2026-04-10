import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const query = useQuery({
    queryKey: ['courier', 'deliveries'],
    queryFn: async () => (await api.get('/courier/deliveries')).data,
  })

  const deliveries = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Deliveries</h1>

      <div className="grid gap-3 md:grid-cols-2">
        {deliveries.map((o) => (
          <Card key={o.id} className="hover:border-zinc-700">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                <Link to={`/courier/delivery/${o.order_number}`} className="hover:text-[var(--accent)]">
                  {o.order_number}
                </Link>
              </CardTitle>
              <Badge>{o.status}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-zinc-400">
                Rp {Number(o.total_amount ?? 0).toLocaleString('id-ID')}
              </div>
            </CardContent>
          </Card>
        ))}
        {query.isLoading ? <div className="text-sm text-zinc-400">Loading...</div> : null}
      </div>
    </div>
  )
}
