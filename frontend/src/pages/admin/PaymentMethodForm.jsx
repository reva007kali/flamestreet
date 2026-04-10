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
  }, [methodQuery.data])

  const payload = useMemo(
    () => ({
      name: String(form.name ?? '').trim(),
      code: nullIfEmpty(form.code),
      type: form.type,
      instructions: nullIfEmpty(form.instructions),
      sort_order: Number(form.sort_order ?? 0),
      is_active: Boolean(form.is_active),
    }),
    [form],
  )

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) return (await api.post('/admin/payment-methods', payload)).data.method
      return (await api.put(`/admin/payment-methods/${id}`, payload)).data.method
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

