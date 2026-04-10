import { Link } from 'react-router-dom'

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

  return (
    <Link
      to={`/orders/${order.order_number}`}
      className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            {imgUrl ? <img src={imgUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{order.order_number}</div>
            <div className="mt-1 text-xs text-zinc-500 capitalize">
              {order.status} • {order.payment_status}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-zinc-400">{order.status}</div>
      </div>
      <div className="mt-2 text-sm text-zinc-300">
        Total: Rp {Number(order.total_amount ?? 0).toLocaleString('id-ID')}
      </div>
    </Link>
  )
}
