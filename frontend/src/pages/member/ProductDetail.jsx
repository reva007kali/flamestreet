import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/axios'
import ModifierSelector from '@/components/order/ModifierSelector'
import { useCartStore } from '@/store/cartStore'

function formatNutritionKey(key) {
  const k = String(key ?? '')
  if (!k.length) return ''
  if (k.endsWith('_g')) return `${k.replace(/_g$/, '').replace(/_/g, ' ')} (g)`
  if (k.endsWith('_kcal')) return `${k.replace(/_kcal$/, '').replace(/_/g, ' ')} (kcal)`
  if (k.endsWith('_mg')) return `${k.replace(/_mg$/, '').replace(/_/g, ' ')} (mg)`
  return k.replace(/_/g, ' ')
}

function hasCompleteModifiers(product, selectedIds) {
  const modifiers = product?.modifiers ?? []
  if (!modifiers.length) return true
  const selected = new Set(selectedIds ?? [])
  return modifiers.every((m) => (m.options ?? []).some((opt) => selected.has(opt.id)))
}

export default function ProductDetail({ basePath = '/member' }) {
  const { slug } = useParams()
  const addItem = useCartStore((s) => s.addItem)
  const [quantity, setQuantity] = useState(1)
  const [modifierOptionIds, setModifierOptionIds] = useState([])

  const query = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => (await api.get(`/products/${slug}`)).data.product,
  })

  const price = useMemo(() => Number(query.data?.price ?? 0), [query.data])

  if (query.isLoading) {
    return <div className="text-zinc-400">Loading...</div>
  }

  if (query.isError) {
    return <div className="text-red-300">Failed to load product.</div>
  }

  const p = query.data
  const nutritionEntries = Object.entries(p.nutritional_info ?? {})
    .filter(([k, v]) => k && v != null)
    .map(([k, v]) => ({ key: k, value: v }))
  const canAddToCart = hasCompleteModifiers(p, modifierOptionIds)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <div className="mt-1 text-zinc-400">Rp {price.toLocaleString('id-ID')}</div>
        </div>
        <Link to={`${basePath}/menu`} className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
          Back
        </Link>
      </div>

      {p.description ? (
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
          {p.description}
        </div>
      ) : null}

      {nutritionEntries.length ? (
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="font-medium">Nutrition</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {nutritionEntries.map((n) => (
              <div
                key={n.key}
                className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              >
                <div className="capitalize text-zinc-400">{formatNutritionKey(n.key)}</div>
                <div className="font-medium text-zinc-100">{n.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ModifierSelector
        modifiers={p.modifiers ?? []}
        value={modifierOptionIds}
        onChange={setModifierOptionIds}
      />
      {Array.isArray(p.modifiers) && p.modifiers.length ? (
        <div className="text-sm text-amber-300">Pilih pilihan/varian terlebih dulu sebelum tambah ke cart.</div>
      ) : null}

      <div className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-10 w-10 rounded bg-zinc-800 hover:bg-zinc-700"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            -
          </button>
          <div className="w-12 text-center">{quantity}</div>
          <button
            type="button"
            className="h-10 w-10 rounded bg-zinc-800 hover:bg-zinc-700"
            onClick={() => setQuantity((q) => q + 1)}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className={[
            'flex-1 rounded px-4 py-2 font-medium',
            canAddToCart
              ? 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]'
              : 'bg-zinc-800 text-zinc-500',
          ].join(' ')}
          onClick={() => {
            if (!canAddToCart) return
            addItem({ product: p, quantity, modifierOptionIds, itemNotes: '' })
          }}
          disabled={!canAddToCart}
        >
          Add to cart
        </button>
      </div>
    </div>
  )
}
