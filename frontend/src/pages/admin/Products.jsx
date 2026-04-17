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
  Star,
  CheckCircle2,
  XCircle,
  LayoutGrid
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
    return path.startsWith('uploads/') ? `${baseUrl}/${path}` : `${baseUrl}/storage/${path}`
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
    <div className="space-y-8 pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-[var(--accent)]" />
            Inventory
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Manage your product catalog and pricing
          </p>
        </div>
        
        <Button asChild className="bg-[var(--accent)] hover:brightness-110 text-[var(--accent-foreground)] font-black uppercase tracking-widest px-6 py-6 rounded-2xl shadow-xl shadow-[var(--accent)]/20">
          <Link to="/admin/products/new">
            <Plus className="mr-2 h-5 w-5 stroke-[3px]" /> New Product
          </Link>
        </Button>
      </div>

      {/* FILTER/SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <Input 
            placeholder="Search assets by name or ID..." 
            className="pl-12 bg-zinc-950 border-zinc-800 rounded-2xl h-12 text-sm focus:ring-[var(--accent)]/50"
          />
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-xl border border-zinc-800">
               <LayoutGrid size={14} className="text-zinc-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total: {products.length}</span>
            </div>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <Card 
            key={p.id} 
            className="group relative overflow-hidden border-zinc-800 bg-zinc-950 shadow-2xl transition-all duration-300 hover:border-[var(--accent)]/50"
          >
            {/* Featured Badge */}
            {p.is_featured ? (
               <div className="absolute top-3 left-3 z-10 bg-[var(--accent)] text-[var(--accent-foreground)] p-1.5 rounded-lg shadow-lg">
                  <Star size={14} fill="currentColor" />
               </div>
            ) : null}

            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden bg-zinc-900">
              {p.image ? (
                <img 
                  src={imageUrl(p.image)} 
                  alt={p.name} 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-zinc-800">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-10" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-20">No Asset</span>
                </div>
              )}
              
              {/* Overlay Actions */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-zinc-950/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100 backdrop-blur-sm">
                <Button asChild variant="secondary" className="h-10 w-10 p-0 rounded-xl bg-white text-black hover:bg-zinc-200">
                  <Link to={`/admin/products/${p.id}`}><Pencil size={18} /></Link>
                </Button>
                <Button 
                  variant="destructive" 
                  className="h-10 w-10 p-0 rounded-xl"
                  disabled={del.isPending}
                  onClick={() => { if (window.confirm('Hapus produk ini?')) del.mutate(p.id) }}
                >
                  <Trash2 size={18} />
                </Button>
              </div>

              {/* Price Label */}
              <div className="absolute bottom-4 right-4">
                <div className="bg-zinc-950/90 border border-zinc-800 text-white font-black text-xs px-3 py-1.5 rounded-xl backdrop-blur-md shadow-2xl">
                  Rp {Number(p.price ?? 0).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            {/* Info Section */}
            <CardContent className="p-5">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                   <Link
                    to={`/admin/products/${p.id}`}
                    className="font-black text-sm text-white uppercase italic tracking-tight hover:text-[var(--accent)] transition-colors line-clamp-1"
                  >
                    {p.name}
                  </Link>
                  <Link to={`/admin/products/${p.id}`}>
                      <ExternalLink size={14} className="text-zinc-700 hover:text-white transition-colors" />
                  </Link>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                   <div className="flex items-center gap-1.5">
                      {p.is_available ? (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 tracking-widest">
                           <CheckCircle2 size={10} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
                           <XCircle size={10} /> Hidden
                        </span>
                      )}
                   </div>
                   <span className="text-[9px] font-black text-zinc-800 uppercase tracking-widest">ID: {p.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* LOADING STATE */}
        {query.isLoading && [1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square rounded-3xl bg-zinc-900 animate-pulse border border-zinc-800" />
        ))}
      </div>

      {/* EMPTY STATE */}
      {products.length === 0 && !query.isLoading && (
        <div className="flex flex-col items-center justify-center py-32 rounded-[2.5rem] border-2 border-dashed border-zinc-900 bg-zinc-950 text-center">
          <div className="h-20 w-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
             <Package className="h-10 w-10 text-zinc-800" />
          </div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Katalog Kosong</h3>
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mt-2">Mulai tambahkan produk asupan protein ke sistem.</p>
          <Button asChild className="mt-8 bg-zinc-800 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] px-8">
             <Link to="/admin/products/new">Initialize Catalog</Link>
          </Button>
        </div>
      )}
    </div>
  )
}