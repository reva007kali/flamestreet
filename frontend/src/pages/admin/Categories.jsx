import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Tag, 
  Plus, 
  Layers, 
  Pencil, 
  Trash2, 
  ChevronRight, 
  Loader2, 
  Hash,
  Activity
} from 'lucide-react'

export default function Categories() {
  const query = useQuery({
    queryKey: ['admin', 'product-categories'],
    queryFn: async () => (await api.get('/admin/product-categories')).data,
  })

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/product-categories/${id}`)
    },
    onSuccess: () => query.refetch(),
  })

  const categories = query.data?.data ?? []

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
            <Layers className="h-8 w-8 text-[var(--accent)]" />
            Category Groups
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Organize and classify your protein products
          </p>
        </div>
        
        <Button asChild className="bg-[var(--accent)] hover:brightness-110 text-[var(--accent-foreground)] font-black uppercase tracking-widest px-6 py-6 rounded-2xl shadow-xl shadow-[var(--accent)]/20">
          <Link to="/admin/categories/new">
            <Plus className="mr-2 h-5 w-5 stroke-[3px]" /> Create Group
          </Link>
        </Button>
      </div>

      {/* STATS PREVIEW */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/40 rounded-xl border border-zinc-800">
           <Hash size={14} className="text-zinc-500" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Total Groups: {categories.length}</span>
        </div>
      </div>

      {/* CATEGORY GRID */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card 
            key={c.id} 
            className="group relative overflow-hidden border-zinc-800 bg-zinc-950 shadow-2xl transition-all duration-300 hover:border-[var(--accent)]/50"
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-900/50 bg-zinc-900/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[var(--accent)] border border-zinc-800">
                  <Tag size={16} />
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-tight text-white group-hover:text-[var(--accent)] transition-colors">
                  {c.name}
                </CardTitle>
              </div>
              <Badge 
                className={`text-[9px] font-black uppercase tracking-widest border-none px-2 h-5 flex items-center ${
                  c.is_active 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {c.is_active ? (
                  <><Activity size={10} className="mr-1" /> Active</>
                ) : 'Inactive'}
              </Badge>
            </CardHeader>

            <CardContent className="p-5">
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">URL Slug</p>
                   <p className="text-xs font-mono text-zinc-400 truncate bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                     /{c.slug}
                   </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button asChild variant="secondary" className="flex-1 rounded-xl h-9 text-[10px] font-black uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800">
                    <Link to={`/admin/categories/${c.id}`}>
                      <Pencil size={12} className="mr-2" /> Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    disabled={del.isPending}
                    onClick={() => {
                      if (!window.confirm('Hapus kategori ini? Semua produk di dalamnya mungkin terpengaruh.')) return
                      del.mutate(c.id)
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </CardContent>

            {/* Subtle bottom accent */}
            <div className={`absolute bottom-0 left-0 h-[2px] w-full transition-all duration-500 ${c.is_active ? 'bg-[var(--accent)] opacity-20' : 'bg-zinc-800'}`} />
          </Card>
        ))}

        {/* LOADING STATE */}
        {query.isLoading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-600">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Mapping Categories...</p>
          </div>
        )}
      </div>

      {/* EMPTY STATE */}
      {!query.isLoading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 rounded-[2.5rem] border-2 border-dashed border-zinc-900 bg-zinc-950 text-center">
          <div className="h-20 w-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
             <Layers className="h-10 w-10 text-zinc-800" />
          </div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tight">No Categories Found</h3>
          <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mt-2">Initialize your inventory by creating the first group.</p>
          <Button asChild className="mt-8 bg-zinc-800 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] px-8 py-6">
             <Link to="/admin/categories/new">Initialize Hub</Link>
          </Button>
        </div>
      )}
    </div>
  )
}