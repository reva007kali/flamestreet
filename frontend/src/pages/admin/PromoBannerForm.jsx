import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function nullIfEmpty(v) {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

export default function PromoBannerForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const bannerQuery = useQuery({
    enabled: !isNew,
    queryKey: ['admin', 'promo-banner', id],
    queryFn: async () => (await api.get(`/admin/promo-banners/${id}`)).data.banner,
  })

  const [form, setForm] = useState({
    audience: 'member',
    kicker: '',
    title: '',
    subtitle: '',
    sort_order: 0,
    is_active: true,
    image: '',
  })

  useEffect(() => {
    if (!bannerQuery.data) return
    const b = bannerQuery.data
    setForm({
      audience: b.audience ?? 'member',
      kicker: b.kicker ?? '',
      title: b.title ?? '',
      subtitle: b.subtitle ?? '',
      sort_order: Number(b.sort_order ?? 0),
      is_active: Boolean(b.is_active),
      image: b.image ?? '',
    })
  }, [bannerQuery.data])

  const payload = useMemo(
    () => ({
      audience: form.audience,
      kicker: nullIfEmpty(form.kicker),
      title: String(form.title ?? '').trim(),
      subtitle: nullIfEmpty(form.subtitle),
      sort_order: Number(form.sort_order ?? 0),
      is_active: Boolean(form.is_active),
      image: nullIfEmpty(form.image),
    }),
    [form],
  )

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) return (await api.post('/admin/promo-banners', payload)).data.banner
      return (await api.put(`/admin/promo-banners/${id}`, payload)).data.banner
    },
    onSuccess: () => navigate('/admin/promo-banners'),
  })

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/promo-banners/${id}`)
    },
    onSuccess: () => navigate('/admin/promo-banners'),
  })

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

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const imageInputRef = useRef(null)

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const uploadImage = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error('No file')
      const fd = new FormData()
      fd.append('image', imageFile)
      return (await api.post(`/admin/promo-banners/${id}/image`, fd)).data
    },
    onSuccess: (data) => {
      setForm((f) => ({ ...f, image: data.image ?? '' }))
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
    },
  })

  const deleteImage = useMutation({
    mutationFn: async () => (await api.delete(`/admin/promo-banners/${id}/image`)).data,
    onSuccess: () => {
      setForm((f) => ({ ...f, image: '' }))
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? 'New Promo Banner' : 'Edit Promo Banner'}</h1>
        <Link to="/admin/promo-banners" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={form.audience} onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">member</SelectItem>
                <SelectItem value="trainer">trainer</SelectItem>
                <SelectItem value="both">both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Kicker</Label>
            <Input value={form.kicker} onChange={(e) => setForm((f) => ({ ...f, kicker: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <div className="space-y-2 md:col-span-2">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Subtitle</Label>
            <Textarea value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="h-40 w-64 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
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

              {isNew ? <div className="w-full text-xs text-zinc-500">Save banner first to upload image.</div> : null}
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
              if (!window.confirm('Delete this banner?')) return
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

