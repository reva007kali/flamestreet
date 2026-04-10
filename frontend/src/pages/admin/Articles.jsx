import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function fmtDate(v) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Articles() {
  const query = useQuery({
    queryKey: ['admin', 'articles'],
    queryFn: async () => (await api.get('/admin/articles')).data,
  })

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/articles/${id}`)
    },
    onSuccess: () => query.refetch(),
  })

  const rows = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <Button asChild>
          <Link to="/admin/articles/new">New</Link>
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
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Pinned</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link to={`/admin/articles/${a.id}`} className="font-medium hover:text-[var(--accent)]">
                      {a.title}
                    </Link>
                    {a.excerpt ? <div className="mt-1 text-xs text-zinc-400">{a.excerpt}</div> : null}
                  </TableCell>
                  <TableCell className="text-zinc-400">{a.slug}</TableCell>
                  <TableCell>
                    <Badge variant={a.is_pinned ? 'success' : 'default'}>{a.is_pinned ? 'yes' : 'no'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.is_published ? 'success' : 'default'}>{a.is_published ? 'yes' : 'no'}</Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400">{fmtDate(a.published_at ?? a.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link to={`/admin/articles/${a.id}`}>Edit</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        type="button"
                        disabled={del.isPending}
                        onClick={() => {
                          if (!window.confirm('Delete this article?')) return
                          del.mutate(a.id)
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

