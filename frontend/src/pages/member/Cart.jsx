import { Link } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'
import { Minus, Plus } from 'lucide-react'

export default function Cart({ basePath = '/member' }) {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const total = useCartStore((s) => s.total)
  const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '')

  function imageUrl(p) {
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    if (p.startsWith('uploads/')) return `${baseUrl}/${p}`
    return `${baseUrl}/storage/${p}`
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cart</h1>

      {items.length ? (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                    {it.product?.image ? (
                      <img src={imageUrl(it.product.image)} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{it.product?.name}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Rp {Number(it.product?.price ?? 0).toLocaleString('id-ID')}
                    </div>
                    {(() => {
                      const choices = selectedChoices(it)
                      return choices.length ? (
                        <div className="mt-2 text-xs text-zinc-400">Pilihan: {choices.join(' • ')}</div>
                      ) : null
                    })()}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm text-red-300 hover:text-red-200"
                  onClick={() => removeItem(idx)}
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 w-9 rounded bg-zinc-800 hover:bg-zinc-700"
                  onClick={() => setQuantity(idx, (it.quantity ?? 1) - 1)}
                >
                  <Minus className="mx-auto h-4 w-4" />
                </button>
                <div className="w-12 text-center">{it.quantity ?? 1}</div>
                <button
                  type="button"
                  className="h-9 w-9 rounded bg-zinc-800 hover:bg-zinc-700"
                  onClick={() => setQuantity(idx, (it.quantity ?? 1) + 1)}
                >
                  <Plus className="mx-auto h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-zinc-800 bg-zinc-900 p-6">
          <div className="text-zinc-400">Cart is empty.</div>
          <div className="mt-4">
            <Link
              to={`${basePath}/menu`}
              className="inline-flex w-full justify-center rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
            >
              Belanja
            </Link>
          </div>
        </div>
      )}

      <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">Subtotal</div>
          <div className="font-medium">Rp {Number(total()).toLocaleString('id-ID')}</div>
        </div>
        <div className="mt-4">
          <Link
            to={`${basePath}/checkout`}
            className={`block rounded px-4 py-2 text-center font-medium ${
              items.length
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]'
                : 'bg-zinc-800 text-zinc-500'
            }`}
            onClick={(e) => {
              if (!items.length) e.preventDefault()
            }}
          >
            Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}
