export default function OrderCard({ order }) {
  const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '')
  const img = order?.items?.[0]?.product_image ?? null
  const imgUrl = img
    ? /^https?:\/\//i.test(img)
      ? img
      : img.startsWith('uploads/')
        ? `${baseUrl}/${img}`
        : `${baseUrl}/storage/${img}`
    : null

  const status = String(order?.status ?? '').toLowerCase()
  const payment = String(order?.payment_status ?? '').toLowerCase()

  const statusBorder = (() => {
    if (status === 'pending') return 'border-amber-500/25 hover:border-amber-500/40'
    if (status === 'confirmed') return 'border-blue-500/25 hover:border-blue-500/40'
    if (status === 'delivering') return 'border-purple-500/25 hover:border-purple-500/40'
    if (status === 'delivered') return 'border-emerald-500/25 hover:border-emerald-500/40'
    if (status === 'cancelled') return 'border-rose-500/25 hover:border-rose-500/40'
    if (status === 'refunded') return 'border-zinc-500/25 hover:border-zinc-500/40'
    return 'border-zinc-800 hover:border-zinc-700'
  })()

  const paymentEmblem = (() => {
    if (payment === 'paid') {
      return {
        label: 'Paid',
        cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
      }
    }
    if (payment === 'unpaid') {
      return {
        label: 'Unpaid',
        cls: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
      }
    }
    if (payment === 'refunded') {
      return {
        label: 'Refunded',
        cls: 'bg-zinc-500/15 text-zinc-200 border-zinc-500/25',
      }
    }
    return {
      label: payment || '-',
      cls: 'bg-zinc-500/15 text-zinc-200 border-zinc-500/25',
    }
  })()

  return (
    <div className={['relative overflow-hidden rounded-[2rem] border bg-zinc-950/70 p-5 transition-colors', statusBorder].join(' ')}>
      <div
        className={[
          'absolute right-4 top-4 z-10 rounded-full border px-4 py-2',
          'text-[11px] font-black uppercase tracking-widest backdrop-blur-md',
          paymentEmblem.cls,
        ].join(' ')}
      >
        {paymentEmblem.label}
      </div>

      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          {imgUrl ? <img src={imgUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1 pr-24">
          <div className="truncate text-sm font-black text-white">{order.order_number}</div>
          <div className="mt-1 text-[11px] font-semibold text-zinc-400 capitalize">
            {order.status}
          </div>
          <div className="mt-3 text-sm font-bold text-zinc-200">
            Total: Rp {Number(order.total_amount ?? 0).toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  )
}
