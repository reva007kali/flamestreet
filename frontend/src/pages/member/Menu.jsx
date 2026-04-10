import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/axios'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'

export default function Menu({ basePath = '/member' }) {
  const navigate = useNavigate()
  const [search, setSearch] = useSearchParams()
  const category = search.get('category') ?? ''
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)
  const baseUrl = useMemo(() => (import.meta.env.VITE_API_URL ?? '').replace(/\/api\/?$/, ''), [])

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data.categories,
  })

  const productsQuery = useQuery({
    queryKey: ['products', { category }],
    queryFn: async () =>
      (await api.get('/products', { params: category ? { category } : {} })).data.data,
  })

  const cartCount = useMemo(
    () => cartItems.reduce((sum, it) => sum + (Number(it.quantity ?? 1) || 1), 0),
    [cartItems],
  )
  const cartTotal = useMemo(
    () =>
      cartItems.reduce((sum, it) => {
        const price = Number(it.product?.price ?? 0)
        const qty = Number(it.quantity ?? 1) || 1
        return sum + price * qty
      }, 0),
    [cartItems],
  )

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message) {
    setToast({ id: crypto.randomUUID(), message })
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1800)
  }

  function quickAdd(product) {
    if (hasModifiers(product)) {
      showToast('Pilih pilihan/varian dulu di halaman detail')
      return
    }
    addItem({ product, quantity: 1, modifierOptionIds: [], itemNotes: '' })
    showToast('Berhasil ditambah ke keranjang')
  }

  function hasModifiers(product) {
    const count = Number(product?.modifiers_count ?? 0)
    if (count > 0) return true
    return Array.isArray(product?.modifiers) && product.modifiers.length > 0
  }

  function imageUrl(p) {
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    if (p.startsWith('uploads/')) return `${baseUrl}/${p}`
    return `${baseUrl}/storage/${p}`
  }

  return (
    <div className={['space-y-6', cartCount ? 'pb-24' : ''].join(' ')}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`rounded px-3 py-1 text-sm ${
            !category ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'bg-zinc-900 text-zinc-300'
          }`}
          onClick={() => setSearch({})}
        >
          All
        </button>
        {(categoriesQuery.data ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            className={`rounded px-3 py-1 text-sm ${
              category === c.slug
                ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                : 'bg-zinc-900 text-zinc-300'
            }`}
            onClick={() => setSearch({ category: c.slug })}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {(productsQuery.data ?? []).map((p) => (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`${basePath}/product/${p.slug}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(`${basePath}/product/${p.slug}`)
            }}
            className="cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 hover:border-zinc-700"
          >
            <div className="relative w-full overflow-hidden bg-zinc-950" style={{ aspectRatio: '16 / 9' }}>
              {p.image ? <img src={imageUrl(p.image)} alt="" className="h-full w-full object-cover" /> : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="mt-1 text-sm text-zinc-400">Rp {Number(p.price ?? 0).toLocaleString('id-ID')}</div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {hasModifiers(p) ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        navigate(`${basePath}/product/${p.slug}`)
                      }}
                    >
                      Pilih
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        quickAdd(p)
                      }}
                    >
                      Add
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(`${basePath}/product/${p.slug}`)
                    }}
                  >
                    Detail
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {productsQuery.isLoading ? <div className="text-sm text-zinc-400">Loading...</div> : null}
      </div>

      {toast ? (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+8rem)] z-40 flex justify-center px-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 shadow-lg">
            {toast.message}
          </div>
        </div>
      ) : null}

      {cartCount ? (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 px-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 backdrop-blur">
            <div className="min-w-0">
              <div className="text-sm font-medium text-zinc-100">{cartCount} items</div>
              <div className="text-xs text-zinc-400">
                Rp {Number(cartTotal ?? 0).toLocaleString('id-ID')}
              </div>
            </div>
            <Button asChild>
              <Link to={`${basePath}/cart`}>View Cart</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
