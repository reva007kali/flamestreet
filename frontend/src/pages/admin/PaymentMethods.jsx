import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function PaymentMethods() {
  const query = useQuery({
    queryKey: ['admin', 'payment-methods'],
    queryFn: async () => (await api.get('/admin/payment-methods')).data,
  })

  const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '')

  function imageUrl(p) {
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    return p.startsWith('uploads/') ? `${baseUrl}/${p}` : `${baseUrl}/storage/${p}`
  }

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/payment-methods/${id}`)
    },
    onSuccess: () => query.refetch(),
  })

  const methods = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Payment Methods</h1>
        <Button asChild>
          <Link to="/admin/payment-methods/new">New</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((m) => (
                <TableRow key={m.id}>
                    <TableCell>
                      <div className="h-9 w-9 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                        {m.icon ? (
                          <img src={imageUrl(m.icon)} alt="" className="h-full w-full object-contain p-1" />
                        ) : null}
                      </div>
                    </TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/admin/payment-methods/${m.id}`} className="hover:text-[var(--accent)]">
                      {m.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-400">{m.code}</TableCell>
                  <TableCell className="text-zinc-400">{m.type}</TableCell>
                  <TableCell>
                    <Badge variant={m.is_active ? 'success' : 'default'}>{m.is_active ? 'active' : 'inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link to={`/admin/payment-methods/${m.id}`}>Edit</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        disabled={del.isPending}
                        onClick={() => {
                          if (!window.confirm('Delete this payment method?')) return
                          del.mutate(m.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
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
