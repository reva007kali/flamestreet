import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function nullIfEmpty(v) {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

export default function CategoryForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const categoryQuery = useQuery({
    enabled: !isNew,
    queryKey: ['admin', 'product-category', id],
    queryFn: async () => (await api.get(`/admin/product-categories/${id}`)).data.category,
  })

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    sort_order: 0,
    is_active: true,
    image: '',
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const imageInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  }, [])

  const currentImageUrl = useMemo(() => {
    const p = form.image
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    if (p.startsWith('uploads/')) return `${baseUrl}/${p}`
    return `${baseUrl}/storage/${p}`
  }, [baseUrl, form.image])

  useEffect(() => {
    if (!categoryQuery.data) return
    const c = categoryQuery.data
    setForm({
      name: c.name ?? '',
      slug: c.slug ?? '',
      description: c.description ?? '',
      sort_order: Number(c.sort_order ?? 0),
      is_active: Boolean(c.is_active),
      image: c.image ?? '',
    })
  }, [categoryQuery.data])

  const payload = useMemo(
    () => ({
      name: String(form.name ?? '').trim(),
      slug: String(form.slug ?? '').trim(),
      description: nullIfEmpty(form.description),
      sort_order: Number(form.sort_order ?? 0),
      is_active: Boolean(form.is_active),
      image: nullIfEmpty(form.image),
    }),
    [form],
  )

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) return (await api.post('/admin/product-categories', payload)).data.category
      return (await api.put(`/admin/product-categories/${id}`, payload)).data.category
    },
    onSuccess: () => navigate('/admin/categories'),
  })

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/product-categories/${id}`)
    },
    onSuccess: () => navigate('/admin/categories'),
  })

  const uploadImage = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error('No file')
      const fd = new FormData()
      fd.append('image', imageFile)
      return (await api.post(`/admin/product-categories/${id}/image`, fd)).data
    },
    onSuccess: (data) => {
      setForm((f) => ({ ...f, image: data.image ?? '' }))
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    },
  })

  const deleteImage = useMutation({
    mutationFn: async () => (await api.delete(`/admin/product-categories/${id}/image`)).data,
    onSuccess: () => {
      setForm((f) => ({ ...f, image: '' }))
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? 'New Category' : 'Edit Category'}</h1>
        <Link to="/admin/categories" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              onBlur={() => {
                if (String(form.slug ?? '').trim().length) return
                const next = String(form.name ?? '')
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '')
                if (next) setForm((f) => ({ ...f, slug: next }))
              }}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="h-40 w-40 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
              ) : currentImageUrl ? (
                <img src={currentImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">No image</div>
              )}
            </div>

            <div className="flex flex-1 flex-wrap gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setImageFile(file)
                  if (imagePreview) URL.revokeObjectURL(imagePreview)
                  setImagePreview(file ? URL.createObjectURL(file) : null)
                }}
              />

              <Button type="button" variant="secondary" size="sm" onClick={() => imageInputRef.current?.click()}>
                {form.image || imagePreview ? 'Replace' : 'Choose file'}
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isNew || !imageFile || uploadImage.isPending}
                onClick={() => uploadImage.mutate()}
              >
                {uploadImage.isPending ? 'Uploading...' : 'Upload'}
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isNew || (!form.image && !imagePreview) || deleteImage.isPending}
                onClick={() => {
                  if (imagePreview) {
                    setImageFile(null)
                    URL.revokeObjectURL(imagePreview)
                    setImagePreview(null)
                    if (imageInputRef.current) imageInputRef.current.value = ''
                    return
                  }
                  if (!window.confirm('Delete image?')) return
                  deleteImage.mutate()
                }}
              >
                {deleteImage.isPending ? 'Deleting...' : 'Delete'}
              </Button>

              {isNew ? <div className="w-full text-xs text-zinc-500">Save category first to upload image.</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            disabled={del.isPending}
            onClick={() => {
              if (!window.confirm('Delete this category?')) return
              del.mutate()
            }}
          >
            {del.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        ) : (
          <div />
        )}

        <Button onClick={() => save.mutate()} disabled={save.isPending} type="button">
          {save.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
