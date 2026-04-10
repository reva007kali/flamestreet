import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

function formatGymAddress(g) {
  const parts = [g?.gym_name, g?.address, g?.city, g?.province].filter(Boolean)
  return parts.join(', ')
}

function selectedChoices(item) {
  const selected = new Set(item?.modifierOptionIds ?? [])
  const mods = item?.product?.modifiers ?? []
  const rows = []
  for (const m of mods) {
    const picked = (m.options ?? []).filter((o) => selected.has(o.id)).map((o) => o.name)
    if (picked.length) rows.push(`${m.name}: ${picked.join(', ')}`)
  }
  return rows
}

export default function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const subtotal = useCartStore((s) => s.total)

  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [recipientName, setRecipientName] = useState(user?.full_name ?? '')
  const [recipientPhone, setRecipientPhone] = useState(user?.phone_number ?? '')
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [gymId, setGymId] = useState('')

  const methodsQuery = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => (await api.get('/payment-methods')).data.methods,
  })

  const isTrainerCheckout = location.pathname.startsWith('/trainer')

  const pointsQuery = useQuery({
    queryKey: ['checkout', 'points', isTrainerCheckout ? 'trainer' : 'member'],
    queryFn: async () => {
      if (isTrainerCheckout) return (await api.get('/trainer/points')).data
      return (await api.get('/member/points')).data
    },
  })

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/me')).data.user,
    onSuccess: (u) => setUser(u),
  })

  const gymsQuery = useQuery({
    queryKey: ['gyms'],
    queryFn: async () => (await api.get('/gyms')).data.gyms,
  })

  useEffect(() => {
    if (!meQuery.data) return
    const def = meQuery.data?.member_profile?.default_gym_id
    if (!gymId && def) setGymId(String(def))
  }, [meQuery.data, gymId])

  const selectedGym = useMemo(() => {
    const id = Number(gymId)
    if (!id) return null
    return (gymsQuery.data ?? []).find((g) => g.id === id) ?? null
  }, [gymId, gymsQuery.data])

  useEffect(() => {
    if (selectedGym) {
      setDeliveryAddress(formatGymAddress(selectedGym))
    }
  }, [selectedGym?.id])

  const payload = useMemo(
    () => ({
      gym_id: gymId ? Number(gymId) : null,
      delivery_address: deliveryAddress,
      delivery_notes: deliveryNotes || null,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      payment_method: paymentMethod || null,
      delivery_fee: gymId ? 0 : 0,
      discount_amount: 0,
      items: items.map((it) => ({
        product_id: it.product.id,
        quantity: it.quantity ?? 1,
        modifier_option_ids: it.modifierOptionIds ?? [],
        item_notes: it.itemNotes ?? null,
      })),
    }),
    [gymId, deliveryAddress, deliveryNotes, recipientName, recipientPhone, paymentMethod, items],
  )

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/orders', payload)).data.order,
    onSuccess: async (order) => {
      clearCart()
      if (paymentMethod && paymentMethod.startsWith('doku-')) {
        try {
          const r = await api.post(`/orders/${order.id}/doku/checkout`)
          const url = r.data?.payment_url
          if (url) {
            window.location.href = url
            return
          }
        } catch {}
      }

      navigate(`/orders/${order.order_number}`)
    },
    onError: (e) => {
      setError(e?.response?.data?.message ?? 'Checkout failed')
    },
  })

  const pointsBalance = Number(pointsQuery.data?.balance ?? 0) || 0
  const pointsDue = Math.round(Number(subtotal()) || 0)
  const pointsOk = paymentMethod !== 'flame-points' || pointsBalance >= pointsDue

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="font-medium">Delivery Info</div>

            <select
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              value={gymId}
              onChange={(e) => {
                const v = e.target.value
                setGymId(v)
                if (!v) setDeliveryAddress('')
              }}
            >
              <option value="">Custom address</option>
              {(gymsQuery.data ?? []).map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.gym_name} (Free delivery)
                </option>
              ))}
            </select>

            {selectedGym ? (
              <div className="rounded border border-[var(--accent-border)] bg-[var(--accent-muted)] px-3 py-2 text-sm text-[var(--accent)]">
                Free delivery to gym coverage
              </div>
            ) : null}

          <textarea
            className="min-h-24 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            placeholder="Delivery address"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
              disabled={Boolean(selectedGym)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            placeholder="Recipient name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            placeholder="Recipient phone"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            placeholder="Notes (optional)"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
          />

          <select
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="">Select payment method</option>
            {(methodsQuery.data ?? []).map((m) => (
              <option key={m.id} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
          {paymentMethod === 'flame-points' ? (
            <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Saldo Flame Points</span>
                <span className="font-medium">{pointsBalance.toLocaleString('id-ID')}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-zinc-400">Total yang dibayar</span>
                <span className="font-medium">{pointsDue.toLocaleString('id-ID')} points</span>
              </div>
              {!pointsOk ? (
                <div className="mt-2 text-xs text-red-300">Saldo point tidak cukup.</div>
              ) : null}
            </div>
          ) : null}
          {error ? <div className="text-sm text-red-300">{error}</div> : null}
          <button
            type="button"
            className="w-full rounded bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            onClick={() => {
              setError(null)
              mutation.mutate()
            }}
            disabled={!items.length || !paymentMethod || !deliveryAddress || mutation.isPending || !pointsOk}
          >
            {mutation.isPending ? 'Placing order...' : 'Place Order'}
          </button>
        </div>

        <div className="space-y-3 rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="font-medium">Summary</div>
          <div className="text-sm text-zinc-400">
            Items: {items.length} • Subtotal: Rp {Number(subtotal()).toLocaleString('id-ID')}
          </div>
          <div className="mt-2 space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="text-zinc-300">
                    {it.product?.name} × {it.quantity ?? 1}
                  </div>
                  {selectedChoices(it).length ? (
                    <div className="mt-1 text-xs text-zinc-500">Pilihan: {selectedChoices(it).join(' • ')}</div>
                  ) : null}
                </div>
                <div className="shrink-0 text-zinc-400">
                  Rp {Number(it.product?.price ?? 0).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
