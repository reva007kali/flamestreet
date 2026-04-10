import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Image as ImageIcon, Pencil, Trash2, X } from 'lucide-react'

export default function Gyms() {
  const [gymName, setGymName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [imageFile, setImageFile] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    gym_name: '',
    address: '',
    city: '',
    province: '',
    is_active: true,
  })
  const [editImageFile, setEditImageFile] = useState(null)

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
    queryKey: ['admin', 'gyms'],
    queryFn: async () => (await api.get('/admin/gyms')).data,
  })

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/admin/gyms', {
        gym_name: gymName,
        address,
        city,
        province,
        is_active: isActive,
      })
      const gym = data.gym

      if (imageFile) {
        const fd = new FormData()
        fd.append('image', imageFile)
        const res = await api.post(`/admin/gyms/${gym.id}/image`, fd)
        return res.data.gym
      }

      return gym
    },
    onSuccess: () => {
      setGymName('')
      setAddress('')
      setCity('')
      setProvince('')
      setIsActive(true)
      setImageFile(null)
      query.refetch()
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, payload, nextImageFile }) => {
      const { data } = await api.put(`/admin/gyms/${id}`, payload)
      let gym = data.gym

      if (nextImageFile) {
        const fd = new FormData()
        fd.append('image', nextImageFile)
        const res = await api.post(`/admin/gyms/${id}/image`, fd)
        gym = res.data.gym
      }

      return gym
    },
    onSuccess: () => {
      setEditingId(null)
      setEditImageFile(null)
      query.refetch()
    },
  })

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/gyms/${id}`)
    },
    onSuccess: () => query.refetch(),
  })

  const delImage = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/gyms/${id}/image`)
    },
    onSuccess: () => query.refetch(),
  })

  const gyms = query.data?.data ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Gyms</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Gym</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Gym name</Label>
              <Input value={gymName} onChange={(e) => setGymName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Province</Label>
              <Input value={province} onChange={(e) => setProvince(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => create.mutate()}
              disabled={!gymName || !address || !city || create.isPending}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {gyms.map((g) => (
          <Card key={g.id}>
            <div className="relative aspect-[16/9] overflow-hidden bg-zinc-950">
              {g.image ? (
                <img
                  src={imageUrl(g.image)}
                  alt={g.gym_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-zinc-700">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                  <span className="text-[10px] uppercase tracking-widest">No Image</span>
                </div>
              )}
            </div>

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{g.gym_name}</CardTitle>
                  <div className="text-xs text-zinc-500">
                    {g.city}
                    {g.province ? ` • ${g.province}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {g.is_active ? (
                    <span className="text-green-500 text-xs px-2 py-1 bg-green-500/10 rounded-full">Active</span>
                  ) : (
                    <span className="text-red-500 text-xs px-2 py-1 bg-red-500/10 rounded-full">Inactive</span>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400 line-clamp-1">{g.address}</div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      if (editingId === g.id) {
                        setEditingId(null)
                        setEditImageFile(null)
                        return
                      }
                      setEditingId(g.id)
                      setEditForm({
                        gym_name: g.gym_name ?? '',
                        address: g.address ?? '',
                        city: g.city ?? '',
                        province: g.province ?? '',
                        is_active: g.is_active ?? true,
                      })
                      setEditImageFile(null)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={del.isPending}
                    onClick={() => {
                      if (!window.confirm('Delete this gym?')) return
                      del.mutate(g.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {editingId === g.id ? (
                <div className="border-t border-zinc-800 pt-4 space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Gym name</Label>
                      <Input
                        value={editForm.gym_name}
                        onChange={(e) => setEditForm({ ...editForm, gym_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Province</Label>
                      <Input
                        value={editForm.province}
                        onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950"
                          checked={editForm.is_active}
                          onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        />
                        Active
                      </label>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Change image</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        disabled={update.isPending}
                        onClick={() => {
                          update.mutate({
                            id: g.id,
                            payload: editForm,
                            nextImageFile: editImageFile,
                          })
                        }}
                      >
                        {update.isPending ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null)
                          setEditImageFile(null)
                        }}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancel
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!g.image || delImage.isPending}
                        onClick={() => {
                          if (!window.confirm('Remove this gym image?')) return
                          delImage.mutate(g.id)
                        }}
                      >
                        Remove image
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
