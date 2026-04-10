import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users } from 'lucide-react'

export default function Members() {
  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  }, [])

  function imageUrl(path) {
    if (!path) return null
    if (/^https?:\/\//i.test(path)) return path
    if (path.startsWith('uploads/')) return `${baseUrl}/${path}`
    return `${baseUrl}/storage/${path}`
  }

  const query = useQuery({
    queryKey: ['admin', 'members'],
    queryFn: async () => (await api.get('/admin/members')).data,
  })

  const members = query.data?.data ?? []
  const money = (v) => `Rp ${Number(v ?? 0).toLocaleString('id-ID')}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-indigo-400" />
        <h1 className="text-2xl font-semibold">Members</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Orders Paid</TableHead>
                <TableHead className="text-right">Total Purchase</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                        {m.avatar ? (
                          <img src={imageUrl(m.avatar)} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.full_name}</div>
                        <div className="text-xs text-zinc-500 truncate">{m.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-zinc-300">
                    {Number(m.items_count ?? 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right text-zinc-300">
                    {Number(m.orders_paid ?? 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-400">
                    {money(m.total_purchase)}
                  </TableCell>
                  <TableCell className="text-right text-zinc-300">
                    {Number(m.total_points ?? 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    {m.is_active ? (
                      <span className="text-green-500 text-xs px-2 py-1 bg-green-500/10 rounded-full">Active</span>
                    ) : (
                      <span className="text-red-500 text-xs px-2 py-1 bg-red-500/10 rounded-full">Inactive</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {query.isLoading ? <div className="mt-3 text-sm text-zinc-400">Loading...</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}

