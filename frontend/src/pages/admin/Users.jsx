import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function Users() {
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
    queryKey: ['admin', 'users'],
    queryFn: async () => (await api.get('/admin/users')).data,
  })

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/users/${id}`)
    },
    onSuccess: () => query.refetch(),
  })

  const users = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button asChild>
          <Link to="/admin/users/new">
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Link>
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
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
                        {u.avatar ? (
                          <img src={imageUrl(u.avatar)} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.full_name}</div>
                        <div className="text-xs text-zinc-500 truncate">@{u.username}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400">{u.email}</TableCell>
                  <TableCell className="text-zinc-400">{u.phone_number}</TableCell>
                  <TableCell className="text-zinc-400">
                    <div className="flex flex-wrap gap-1">
                      {(u.roles ?? []).map(r => (
                        <span key={r} className="bg-zinc-800 text-xs px-2 py-0.5 rounded-md uppercase tracking-wider text-zinc-300">
                          {r}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <span className="text-green-500 text-xs px-2 py-1 bg-green-500/10 rounded-full">Active</span>
                    ) : (
                      <span className="text-red-500 text-xs px-2 py-1 bg-red-500/10 rounded-full">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0">
                        <Link to={`/admin/users/${u.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 w-8 p-0"
                        disabled={del.isPending}
                        onClick={() => {
                          if (window.confirm('Delete this user?')) {
                            del.mutate(u.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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
