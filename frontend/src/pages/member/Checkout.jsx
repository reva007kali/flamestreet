import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { 
  MapPin, 
  Truck, 
  CreditCard, 
  User as UserIcon, 
  Phone, 
  FileText, 
  Wallet, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react'

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
    if (picked.length) rows.push(picked.join(', '))
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
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black italic tracking-tight text-white uppercase flex items-center gap-2">
          <Sparkles className="text-[var(--accent)]" size={24} fill="currentColor" />
          Checkout
        </h1>
        <p className="text-sm text-zinc-500 font-medium">Selesaikan pesanan asupan proteinmu hari ini.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: FORMS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Delivery Section */}
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-900">
               <Truck size={18} className="text-[var(--accent)]" />
               <h2 className="text-sm font-bold text-white uppercase tracking-widest">Delivery Details</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Destination</label>
                <div className="grid grid-cols-2 gap-2">
                   <button 
                     onClick={() => { setGymId(''); setDeliveryAddress(''); }}
                     className={`rounded-xl border p-3 text-center transition-all ${!gymId ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500'}`}
                   >
                     <MapPin size={16} className="mx-auto mb-1" />
                     <span className="text-[11px] font-bold uppercase">Custom Address</span>
                   </button>
                   <div className="relative">
                      <select
                        className={`w-full h-full appearance-none rounded-xl border p-3 text-center text-[11px] font-bold uppercase outline-none transition-all ${gymId ? 'border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500'}`}
                        value={gymId}
                        onChange={(e) => setGymId(e.target.value)}
                      >
                        <option value="" className="bg-zinc-900 text-white">Select Gym</option>
                        {(gymsQuery.data ?? []).map((g) => (
                          <option key={g.id} value={String(g.id)} className="bg-zinc-900 text-white">{g.gym_name}</option>
                        ))}
                      </select>
                      {gymId && <CheckCircle2 size={12} className="absolute top-2 right-2 text-[var(--accent)]" />}
                   </div>
                </div>
              </div>

              {selectedGym && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-[11px] font-bold text-emerald-500 uppercase tracking-widest">
                  <Sparkles size={14} /> Free delivery to {selectedGym.gym_name} coverage
                </div>
              )}

              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Full Address</label>
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)] transition-all disabled:opacity-50"
                      placeholder="Street name, building, unit number..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      disabled={Boolean(selectedGym)}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Recipient</label>
                      <div className="relative">
                        <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Phone</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                        />
                      </div>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Delivery Notes</label>
                    <div className="relative">
                      <FileText size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-[var(--accent)]"
                        placeholder="e.g. Near the lobby door"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                      />
                    </div>
                 </div>
              </div>
            </div>
          </section>

          {/* Payment Section */}
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-900">
               <CreditCard size={18} className="text-[var(--accent)]" />
               <h2 className="text-sm font-bold text-white uppercase tracking-widest">Payment Method</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {(methodsQuery.data ?? []).map((m) => (
                 <button
                   key={m.id}
                   onClick={() => setPaymentMethod(m.code)}
                   className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${paymentMethod === m.code ? 'border-[var(--accent)] bg-[var(--accent)]/5 shadow-lg shadow-[var(--accent)]/5' : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900'}`}
                 >
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${paymentMethod === m.code ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-zinc-800 text-zinc-500'}`}>
                         {m.code === 'flame-points' ? <Wallet size={16} /> : <CreditCard size={16} />}
                      </div>
                      <span className={`text-[11px] font-black uppercase tracking-tight ${paymentMethod === m.code ? 'text-white' : 'text-zinc-500'}`}>{m.name}</span>
                   </div>
                   {paymentMethod === m.code && <CheckCircle2 size={16} className="text-[var(--accent)]" />}
                 </button>
               ))}
            </div>

            {paymentMethod === 'flame-points' && (
              <div className="rounded-2xl bg-[var(--accent)]/5 border border-[var(--accent)]/20 p-5 space-y-3">
                 <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">Poin Saldo</span>
                    <span className="text-white">{pointsBalance.toLocaleString('id-ID')} Pts</span>
                 </div>
                 <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                    <span className="text-zinc-500">Bill Total</span>
                    <span className="text-[var(--accent)] font-black">{pointsDue.toLocaleString('id-ID')} Pts</span>
                 </div>
                 {!pointsOk && (
                   <div className="flex items-center gap-2 mt-2 pt-3 border-t border-[var(--accent)]/10 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                     <AlertCircle size={14} /> Saldo tidak cukup
                   </div>
                 )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="lg:col-span-5 sticky top-24">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)] opacity-[0.02] blur-3xl rounded-full" />
            
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6">Order Summary</h2>

            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between gap-4 py-2">
                   <div className="min-w-0">
                      <div className="text-[13px] font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
                         <span className="text-[var(--accent)] text-[10px]">x{it.quantity ?? 1}</span>
                         {it.product?.name}
                      </div>
                      {selectedChoices(it).length > 0 && (
                        <div className="text-[10px] text-zinc-500 mt-1 font-medium italic">
                           {selectedChoices(it).join(' • ')}
                        </div>
                      )}
                   </div>
                   <div className="shrink-0 text-[11px] font-bold text-zinc-400 tabular-nums">
                      Rp {(Number(it.product?.price ?? 0) * (it.quantity ?? 1)).toLocaleString('id-ID')}
                   </div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3 border-t border-zinc-900 pt-6">
               <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                  <span>Subtotal</span>
                  <span className="text-zinc-200">Rp {Number(subtotal()).toLocaleString('id-ID')}</span>
               </div>
               <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                  <span>Delivery Fee</span>
                  <span className={gymId ? 'text-emerald-500 italic' : 'text-zinc-200'}>{gymId ? 'Free' : 'Rp 0'}</span>
               </div>
               <div className="flex justify-between items-end pt-2">
                  <span className="text-sm font-black text-white uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-black text-[var(--accent)] tabular-nums tracking-tighter">
                     Rp {Number(subtotal()).toLocaleString('id-ID')}
                  </span>
               </div>
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                 <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              type="button"
              className="mt-8 w-full group flex items-center justify-center gap-3 rounded-2xl bg-[var(--accent)] py-5 text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] shadow-xl shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
              onClick={() => { setError(null); mutation.mutate(); }}
              disabled={!items.length || !paymentMethod || !deliveryAddress || mutation.isPending || !pointsOk}
            >
              {mutation.isPending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>Place Order <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}