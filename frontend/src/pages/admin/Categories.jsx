import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Categories() {
  const query = useQuery({
    queryKey: ['admin', 'product-categories'],
    queryFn: async () => (await api.get('/admin/product-categories')).data,
  })

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/product-categories/${id}`)
    },
    onSuccess: () => query.refetch(),
  })

  const categories = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Product Categories</h1>
        <Button asChild>
          <Link to="/admin/categories/new">New</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {categories.map((c) => (
          <Card key={c.id} className="hover:border-zinc-700">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">
                <Link to={`/admin/categories/${c.id}`} className="hover:text-[var(--accent)]">
                  {c.name}
                </Link>
              </CardTitle>
              <Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'active' : 'inactive'}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-zinc-400">{c.slug}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link to={`/admin/categories/${c.id}`}>Edit</Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  type="button"
                  disabled={del.isPending}
                  onClick={() => {
                    if (!window.confirm('Delete this category?')) return
                    del.mutate(c.id)
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {query.isLoading ? <div className="text-sm text-zinc-400">Loading...</div> : null}
      </div>
    </div>
  )
}
