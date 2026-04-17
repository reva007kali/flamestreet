import { Link } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight, Sparkles } from 'lucide-react'

export default function Cart({ basePath = '/member' }) {
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const total = useCartStore((s) => s.total)
  const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, '')

  function imageUrl(p) {
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    return p.startsWith('uploads/') ? `${baseUrl}/${p}` : `${baseUrl}/storage/${p}`
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

  return (
    <div className="mx-auto max-w-2xl pb-32">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between px-1">
        <div>
          <h1 className="text-2xl font-black italic tracking-tight text-white uppercase flex items-center gap-2">
            <Sparkles className="text-[var(--accent)]" size={24} fill="currentColor" />
            Your Basket
          </h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
            {items.length} items ready to fuel you
          </p>
        </div>
      </div>

      {items.length ? (
        <div className="space-y-4">
          {items.map((it, idx) => (
            <div 
              key={idx} 
              className="group relative flex flex-col rounded-3xl border border-zinc-900 bg-zinc-950/50 p-4 transition-all hover:border-zinc-800"
            >
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                  {it.product?.image ? (
                    <img src={imageUrl(it.product.image)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] italic text-zinc-700">No Image</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-black text-white uppercase tracking-tight">
                      {it.product?.name}
                    </h3>
                    <button
                      type="button"
                      className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <p className="text-xs font-bold text-[var(--accent)]">
                    Rp {Number(it.product?.price ?? 0).toLocaleString('id-ID')}
                  </p>

                  {(() => {
                    const choices = selectedChoices(it)
                    return choices.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {choices.map((c, i) => (
                          <span key={i} className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-500 border border-zinc-800">
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="mt-4 flex items-center justify-between border-t border-zinc-900/50 pt-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Quantity</span>
                <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all active:scale-90"
                    onClick={() => setQuantity(idx, (it.quantity ?? 1) - 1)}
                  >
                    <Minus size={14} />
                  </button>
                  <div className="w-10 text-center text-sm font-bold text-white tabular-nums">
                    {it.quantity ?? 1}
                  </div>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent)] hover:bg-zinc-800 transition-all active:scale-90"
                    onClick={() => setQuantity(idx, (it.quantity ?? 1) + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900">
            <ShoppingBag size={32} className="text-zinc-700" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight italic">Your cart is empty</h2>
          <p className="mt-2 text-sm text-zinc-500">Looks like you haven't added any meals yet.</p>
          <div className="mt-8 w-full max-w-xs px-4">
            <Link
              to={`${basePath}/menu`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 text-xs font-black uppercase tracking-widest text-[var(--accent-foreground)] shadow-xl shadow-[var(--accent)]/10 hover:brightness-110 active:scale-95 transition-all"
            >
              Start Shopping <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Summary Section - Sticky or Bottom Styled */}
      {items.length > 0 && (
        <div className="mt-10 rounded-3xl border border-zinc-900 bg-zinc-950 p-6 shadow-2xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
              <span>Item Total</span>
              <span className="text-zinc-300">{items.length} items</span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
              <span className="text-sm font-black text-white uppercase tracking-tight">Grand Total</span>
              <span className="text-lg font-black text-[var(--accent)] tabular-nums">
                Rp {Number(total()).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="mt-8">
            <Link
              to={`${basePath}/checkout`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] py-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--accent-foreground)] shadow-xl shadow-[var(--accent)]/20 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Proceed to Checkout <ChevronRight size={18} />
            </Link>
            <Link
              to={`${basePath}/menu`}
              className="mt-4 block text-center text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Add more items
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}