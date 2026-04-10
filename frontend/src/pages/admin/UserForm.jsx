import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save } from 'lucide-react'

export default function UserForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    full_name: '',
    username: '',
    phone_number: '',
    email: '',
    password: '',
    role: 'member',
    is_active: true,
    date_of_birth: '',
    gym_id: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: async () => (await api.get(`/admin/users/${id}`)).data,
    enabled: isEdit,
  })

  const { data: gymsData } = useQuery({
    queryKey: ['admin', 'gyms'],
    queryFn: async () => (await api.get('/admin/gyms')).data,
  })
  const gyms = gymsData?.data ?? []

  useEffect(() => {
    if (data) {
      let dob = data.member_profile?.date_of_birth || data.trainer_profile?.date_of_birth || ''
      if (dob && dob.length > 10) dob = dob.substring(0, 10)
      
      setForm({
        full_name: data.full_name || '',
        username: data.username || '',
        phone_number: data.phone_number || '',
        email: data.email || '',
        password: '',
        role: data.roles?.[0] || 'member',
        is_active: data.is_active ?? true,
        date_of_birth: dob,
        gym_id: data.trainer_profile?.gym_id || '',
      })
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return await api.put(`/admin/users/${id}`, payload)
      }
      return await api.post('/admin/users', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users'])
      navigate('/admin/users')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  if (isEdit && isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link to="/admin/users">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            {isEdit ? 'Edit User' : 'New User'}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  required
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password {isEdit && <span className="text-xs text-zinc-500">(Leave empty to keep)</span>}</Label>
                <Input
                  type="password"
                  required={!isEdit}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  required
                  className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                  <option value="courier">Courier</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
            </div>

            {/* Additional Fields based on Role */}
            {(form.role === 'trainer' || form.role === 'member') && (
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                />
              </div>
            )}

            {form.role === 'trainer' && (
              <div className="space-y-2">
                <Label>Gym (for Trainer)</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.gym_id}
                  onChange={(e) => setForm({ ...form, gym_id: e.target.value })}
                >
                  <option value="">Select a Gym (Optional)</option>
                  {gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.gym_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="is_active"
                className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active Account</Label>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Save className="mr-2 h-4 w-4" />
                {mutation.isPending ? 'Saving...' : 'Save User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
