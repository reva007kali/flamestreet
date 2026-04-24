import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function nullIfEmpty(v) {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

export default function PaymentMethodForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '')

  function imageUrl(p) {
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    return p.startsWith('uploads/') ? `${baseUrl}/${p}` : `${baseUrl}/storage/${p}`
  }

  const methodQuery = useQuery({
    enabled: !isNew,
    queryKey: ['admin', 'payment-method', id],
    queryFn: async () => (await api.get(`/admin/payment-methods/${id}`)).data.method,
  })

  const [form, setForm] = useState({
    name: '',
    code: '',
    type: 'bank_transfer',
    instructions: '',
    sort_order: 0,
    is_active: true,
  })

  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState(null)

  useEffect(() => {
    if (!iconFile) {
      setIconPreview(null)
      return
    }
    const url = URL.createObjectURL(iconFile)
    setIconPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [iconFile])

  useEffect(() => {
    if (!methodQuery.data) return
    const m = methodQuery.data
    setForm({
      name: m.name ?? '',
      code: m.code ?? '',
      type: m.type ?? 'bank_transfer',
      instructions: m.instructions ?? '',
      sort_order: Number(m.sort_order ?? 0),
      is_active: Boolean(m.is_active),
    })
    setIconFile(null)
  }, [methodQuery.data])

  const formData = useMemo(() => {
    const fd = new FormData()
    fd.append('name', String(form.name ?? '').trim())
    fd.append('code', nullIfEmpty(form.code) ?? '')
    fd.append('type', form.type)
    fd.append('instructions', nullIfEmpty(form.instructions) ?? '')
    fd.append('sort_order', String(Number(form.sort_order ?? 0)))
    fd.append('is_active', form.is_active ? '1' : '0')
    if (iconFile) fd.append('icon', iconFile)
    return fd
  }, [form, iconFile])

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) return (await api.post('/admin/payment-methods', formData)).data.method
      const fd = new FormData()
      for (const [k, v] of formData.entries()) fd.append(k, v)
      fd.append('_method', 'PUT')
      return (await api.post(`/admin/payment-methods/${id}`, fd)).data.method
    },
    onSuccess: () => navigate('/admin/payment-methods'),
  })

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/payment-methods/${id}`)
    },
    onSuccess: () => navigate('/admin/payment-methods'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? 'New Payment Method' : 'Edit Payment Method'}</h1>
        <Link to="/admin/payment-methods" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                {iconPreview || methodQuery.data?.icon ? (
                  <img
                    src={iconPreview ?? imageUrl(methodQuery.data?.icon)}
                    alt=""
                    className="h-full w-full object-contain p-2"
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                />
                {iconFile ? (
                  <Button type="button" variant="secondary" onClick={() => setIconFile(null)}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">bank_transfer</SelectItem>
                <SelectItem value="cash">cash</SelectItem>
                <SelectItem value="other">other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <div className="space-y-2 md:col-span-2">
            <Label>Instructions</Label>
            <Textarea
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            disabled={del.isPending}
            onClick={() => {
              if (!window.confirm('Delete this payment method?')) return
              del.mutate()
            }}
          >
            {del.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        ) : (
          <div />
        )}

        <Button onClick={() => save.mutate()} disabled={save.isPending} type="button">
          {save.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
