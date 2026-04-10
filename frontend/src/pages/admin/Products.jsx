import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useMemo } from 'react'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Package, 
  Image as ImageIcon, 
  Search,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export default function Products() {
  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  }, [])

  function imageUrl(path) {
    if (!path) return null
    if (/^https?:\/\//i.test(path)) return path
    if (path.startsWith('uploads/')) return `${baseUrl}/${path}`
    return `${baseUrl}/storage/${path}`
  }

  const query = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: async () => (await api.get('/admin/products')).data,
  })

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/products/${id}`)
    },
    onSuccess: () => query.refetch(),
  })

  const products = query.data?.data ?? []

  return (
    <div className="space-y-8 p-1">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="h-8 w-8 text-indigo-500" />
            Products
          </h1>
          <p className="text-zinc-400 text-sm">Kelola katalog produk dan harga di sini.</p>
        </div>
        
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
          <Link to="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Link>
        </Button>
      </div>

      {/* FILTER/SEARCH BAR (Visual Only) */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input 
            placeholder="Search products..." 
            className="pl-10 bg-zinc-900/50 border-zinc-800 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-zinc-500 bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800">
          Total: <span className="text-zinc-200 font-bold">{products.length} Items</span>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <Card 
            key={p.id} 
            className="group overflow-hidden border-zinc-800 bg-zinc-900/40 transition-all duration-300 hover:border-zinc-600 hover:shadow-xl hover:shadow-black/40"
          >
            {/* Image Container */}
            <div className="relative aspect-[16/9] overflow-hidden bg-zinc-950">
              {p.image ? (
                <img 
                  src={imageUrl(p.image)} 
                  alt={p.name} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100" 
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900 text-zinc-700">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                  <span className="text-[10px] uppercase tracking-widest">No Image</span>
                </div>
              )}
              
              {/* Floating Action Overlay (Muncul saat hover) */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <Button asChild size="sm" variant="secondary" className="h-9 w-9 p-0 rounded-full">
                  <Link to={`/admin/products/${p.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="h-9 w-9 p-0 rounded-full"
                  disabled={del.isPending}
                  onClick={() => {
                    if (!window.confirm('Hapus produk ini?')) return
                    del.mutate(p.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Price Badge Overlay */}
              <div className="absolute bottom-3 right-3">
                <Badge className="bg-zinc-950/80 text-indigo-400 backdrop-blur-md border-zinc-700 font-bold px-3 py-1">
                  Rp {Number(p.price ?? 0).toLocaleString('id-ID')}
                </Badge>
              </div>
            </div>

            {/* Product Info */}
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <Link
                    to={`/admin/products/${p.id}`}
                    className="font-semibold text-zinc-100 hover:text-indigo-400 transition-colors line-clamp-1 block"
                  >
                    {p.name}
                  </Link>
                  <div className="flex items-center text-[10px] text-zinc-500 uppercase tracking-tighter">
                    Product ID: <span className="ml-1 text-zinc-400">{p.id}</span>
                  </div>
                </div>
                <Link to={`/admin/products/${p.id}`}>
                    <ExternalLink className="h-4 w-4 text-zinc-600 hover:text-indigo-500 transition-colors" />
                </Link>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                 <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-full opacity-30" />
                 </div>
                 <span className="ml-3 text-[10px] text-zinc-500 font-medium">ACTIVE</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* LOADING STATE PLACEHOLDERS */}
        {query.isLoading && [1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[3/2] rounded-xl bg-zinc-900 animate-pulse border border-zinc-800" />
        ))}
      </div>

      {/* EMPTY STATE */}
      {products.length === 0 && !query.isLoading && (
        <div className="flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-900/20 text-zinc-500">
          <Package className="h-12 w-12 mb-4 opacity-20" />
          <h3 className="text-xl font-medium text-zinc-300">Belum ada produk</h3>
          <p className="text-sm mt-1">Klik tombol 'Add Product' untuk mulai mengisi katalog.</p>
        </div>
      )}
    </div>
  )
}