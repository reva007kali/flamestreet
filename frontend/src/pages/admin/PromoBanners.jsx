import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMemo } from 'react'

export default function PromoBanners() {
  const query = useQuery({
    queryKey: ['admin', 'promo-banners'],
    queryFn: async () => (await api.get('/admin/promo-banners')).data,
  })

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/promo-banners/${id}`)
    },
    onSuccess: () => query.refetch(),
  })

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

  const banners = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Promo Banners</h1>
        <Button asChild>
          <Link to="/admin/promo-banners/new">New</Link>
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
                <TableHead>Banner</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
                        {b.image ? (
                          <img src={imageUrl(b.image)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/admin/promo-banners/${b.id}`} className="font-medium hover:text-[var(--accent)]">
                          {b.title}
                        </Link>
                        {b.subtitle ? <div className="truncate text-xs text-zinc-400">{b.subtitle}</div> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400">{b.audience}</TableCell>
                  <TableCell>
                    <Badge variant={b.is_active ? 'success' : 'default'}>{b.is_active ? 'active' : 'inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link to={`/admin/promo-banners/${b.id}`}>Edit</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        disabled={del.isPending}
                        onClick={() => {
                          if (!window.confirm('Delete this banner?')) return
                          del.mutate(b.id)
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

