import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import RichTextEditor from '@/components/common/RichTextEditor'

function nullIfEmpty(v) {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

function slugify(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function fmtDateForInput(v) {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function ArticleForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const query = useQuery({
    enabled: !isNew,
    queryKey: ['admin', 'article', id],
    queryFn: async () => (await api.get(`/admin/articles/${id}`)).data.article,
  })

  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    is_pinned: false,
    is_published: true,
    published_at: '',
    cover_image: '',
    content_html: '',
  })

  useEffect(() => {
    if (!query.data) return
    const a = query.data
    setForm({
      title: a.title ?? '',
      slug: a.slug ?? '',
      excerpt: a.excerpt ?? '',
      is_pinned: Boolean(a.is_pinned),
      is_published: Boolean(a.is_published),
      published_at: fmtDateForInput(a.published_at ?? a.created_at),
      cover_image: a.cover_image ?? '',
      content_html: a.content_html ?? '',
    })
  }, [query.data])

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  }, [])

  const coverUrl = useMemo(() => {
    const p = form.cover_image
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    if (p.startsWith('uploads/')) return `${baseUrl}/${p}`
    return `${baseUrl}/storage/${p}`
  }, [baseUrl, form.cover_image])

  const payload = useMemo(
    () => ({
      title: String(form.title ?? '').trim(),
      slug: String(form.slug ?? '').trim(),
      excerpt: nullIfEmpty(form.excerpt),
      is_pinned: Boolean(form.is_pinned),
      is_published: Boolean(form.is_published),
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      cover_image: nullIfEmpty(form.cover_image),
      content_html: nullIfEmpty(form.content_html),
    }),
    [form],
  )

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) return (await api.post('/admin/articles', payload)).data.article
      return (await api.put(`/admin/articles/${id}`, payload)).data.article
    },
    onSuccess: () => navigate('/admin/articles'),
  })

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/articles/${id}`)
    },
    onSuccess: () => navigate('/admin/articles'),
  })

  const fileRef = useRef(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const uploadCover = useMutation({
    mutationFn: async () => {
      if (!coverFile) throw new Error('No file')
      const fd = new FormData()
      fd.append('image', coverFile)
      return (await api.post(`/admin/articles/${id}/cover`, fd)).data
    },
    onSuccess: (data) => {
      setForm((f) => ({ ...f, cover_image: data.image ?? '' }))
      setCoverFile(null)
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      setCoverPreview(null)
      if (fileRef.current) fileRef.current.value = ''
    },
  })

  const deleteCover = useMutation({
    mutationFn: async () => (await api.delete(`/admin/articles/${id}/cover`)).data,
    onSuccess: () => {
      setForm((f) => ({ ...f, cover_image: '' }))
      setCoverFile(null)
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      setCoverPreview(null)
      if (fileRef.current) fileRef.current.value = ''
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? 'New Article' : 'Edit Article'}</h1>
        <Link to="/admin/articles" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              onBlur={() => {
                if (String(form.slug ?? '').trim().length) return
                const next = slugify(form.title)
                if (next) setForm((f) => ({ ...f, slug: next }))
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Published Date</Label>
            <Input
              type="date"
              value={form.published_at}
              onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
            />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm((f) => ({ ...f, is_pinned: e.target.checked }))}
            />
            Pinned
          </label>
          <div className="space-y-2 md:col-span-2">
            <Label>Excerpt</Label>
            <Textarea value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cover Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="h-40 w-64 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="h-full w-full object-cover" />
              ) : coverUrl ? (
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">No image</div>
              )}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setCoverFile(file)
                  if (coverPreview) URL.revokeObjectURL(coverPreview)
                  setCoverPreview(file ? URL.createObjectURL(file) : null)
                }}
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                {form.cover_image || coverPreview ? 'Replace' : 'Choose file'}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isNew || !coverFile || uploadCover.isPending}
                onClick={() => uploadCover.mutate()}
              >
                {uploadCover.isPending ? 'Uploading...' : 'Upload'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isNew || (!form.cover_image && !coverPreview) || deleteCover.isPending}
                onClick={() => {
                  if (coverPreview) {
                    setCoverFile(null)
                    URL.revokeObjectURL(coverPreview)
                    setCoverPreview(null)
                    if (fileRef.current) fileRef.current.value = ''
                    return
                  }
                  if (!window.confirm('Delete cover?')) return
                  deleteCover.mutate()
                }}
              >
                {deleteCover.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              {isNew ? <div className="w-full text-xs text-zinc-500">Save article first to upload cover.</div> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <RichTextEditor value={form.content_html} onChange={(html) => setForm((f) => ({ ...f, content_html: html }))} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            disabled={del.isPending}
            onClick={() => {
              if (!window.confirm('Delete this article?')) return
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

