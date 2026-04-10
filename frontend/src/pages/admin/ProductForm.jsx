import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function emptyModifier() {
  return { name: '', type: 'single', is_required: false, sort_order: 0, options: [] }
}

function emptyOption() {
  return { name: '', additional_price: 0, is_default: false, sort_order: 0 }
}

function nullIfEmpty(v) {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

function nutritionEntriesFromObject(obj) {
  const base = obj && typeof obj === 'object' ? obj : {}
  const entries = Object.entries(base).map(([k, v]) => ({
    key: String(k),
    value: v == null ? '' : String(v),
  }))
  return entries.length ? entries : [{ key: 'protein_g', value: '0' }]
}

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'product-categories'],
    queryFn: async () => (await api.get('/admin/product-categories')).data.data,
  })

  const productQuery = useQuery({
    enabled: !isNew,
    queryKey: ['admin', 'product', id],
    queryFn: async () => (await api.get(`/admin/products/${id}`)).data.product,
  })

  const [form, setForm] = useState({
    category_id: '',
    name: '',
    slug: '',
    description: '',
    ingredients: '',
    hpp: 0,
    price: 0,
    image: '',
    images: [],
    weight_gram: '',
    point_reward_member: 0,
    point_reward_trainer: 0,
    sort_order: 0,
    is_available: true,
    is_featured: false,
    nutrition: [{ key: 'protein_g', value: '0' }],
    modifiers: [],
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
    if (!productQuery.data) return
    const p = productQuery.data
    setForm({
      category_id: p.category_id ?? '',
      name: p.name ?? '',
      slug: p.slug ?? '',
      description: p.description ?? '',
      ingredients: p.ingredients ?? '',
      hpp: Number(p.hpp ?? 0),
      price: Number(p.price ?? 0),
      image: p.image ?? '',
      images: Array.isArray(p.images) ? p.images : [],
      weight_gram: p.weight_gram ?? '',
      point_reward_member: Number(p.point_reward_member ?? p.point_reward ?? 0),
      point_reward_trainer: Number(p.point_reward_trainer ?? p.point_reward ?? 0),
      sort_order: Number(p.sort_order ?? 0),
      is_available: Boolean(p.is_available),
      is_featured: Boolean(p.is_featured),
      nutrition: nutritionEntriesFromObject(p.nutritional_info),
      modifiers: (p.modifiers ?? []).map((m) => ({
        name: m.name ?? '',
        type: m.type ?? 'single',
        is_required: Boolean(m.is_required),
        sort_order: Number(m.sort_order ?? 0),
        options: (m.options ?? []).map((o) => ({
          name: o.name ?? '',
          additional_price: Number(o.additional_price ?? 0),
          is_default: Boolean(o.is_default),
          sort_order: Number(o.sort_order ?? 0),
        })),
      })),
    })
  }, [productQuery.data])

  const payload = useMemo(() => {
    const modifiers = (form.modifiers ?? [])
      .map((m) => ({
        name: String(m.name ?? '').trim(),
        type: m.type ?? 'single',
        is_required: Boolean(m.is_required),
        sort_order: Number(m.sort_order ?? 0),
        options: (m.options ?? [])
          .map((o) => ({
            name: String(o.name ?? '').trim(),
            additional_price: Number(o.additional_price ?? 0),
            is_default: Boolean(o.is_default),
            sort_order: Number(o.sort_order ?? 0),
          }))
          .filter((o) => o.name.length),
      }))
      .filter((m) => m.name.length)

    const nutritional_info = (form.nutrition ?? []).reduce((acc, it) => {
      const k = String(it?.key ?? '').trim()
      if (!k.length) return acc
      const n = Number(it?.value ?? 0)
      if (!Number.isFinite(n)) return acc
      acc[k] = n
      return acc
    }, {})

    const images = Array.isArray(form.images) && form.images.length ? form.images : null

    return {
      category_id: Number(form.category_id),
      name: String(form.name ?? '').trim(),
      slug: String(form.slug ?? '').trim(),
      description: nullIfEmpty(form.description),
      ingredients: nullIfEmpty(form.ingredients),
      nutritional_info: Object.keys(nutritional_info).length ? nutritional_info : null,
      hpp: Number(form.hpp),
      price: Number(form.price),
      image: nullIfEmpty(form.image),
      images,
      weight_gram: form.weight_gram === '' ? null : Number(form.weight_gram),
      is_available: Boolean(form.is_available),
      is_featured: Boolean(form.is_featured),
      sort_order: Number(form.sort_order ?? 0),
      point_reward: Number(form.point_reward_member ?? 0),
      point_reward_member: Number(form.point_reward_member ?? 0),
      point_reward_trainer: Number(form.point_reward_trainer ?? 0),
      modifiers: modifiers.length ? modifiers : null,
    }
  }, [form])

  const save = useMutation({
    mutationFn: async () => {
      if (isNew) return (await api.post('/admin/products', payload)).data.product
      return (await api.put(`/admin/products/${id}`, payload)).data.product
    },
    onSuccess: () => navigate('/admin/products'),
  })

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/products/${id}`)
    },
    onSuccess: () => navigate('/admin/products'),
  })

  const uploadImage = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error('No file')
      const fd = new FormData()
      fd.append('image', imageFile)
      return (await api.post(`/admin/products/${id}/image`, fd)).data
    },
    onSuccess: (data) => {
      setForm((f) => ({ ...f, image: data.image ?? '' }))
      setImageFile(null)
      if (imagePreview) URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    },
  })

  const deleteImage = useMutation({
    mutationFn: async () => (await api.delete(`/admin/products/${id}/image`)).data,
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
        <h1 className="text-2xl font-semibold">{isNew ? 'New Product' : 'Edit Product'}</h1>
        <Link to="/admin/products" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]">
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category_id ? String(form.category_id) : undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(categoriesQuery.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2">
              <Label>Weight (gram)</Label>
              <Input
                value={form.weight_gram}
                onChange={(e) => setForm((f) => ({ ...f, weight_gram: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Ingredients</Label>
              <Textarea
                value={form.ingredients}
                onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>HPP</Label>
            <Input value={form.hpp} onChange={(e) => setForm((f) => ({ ...f, hpp: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Price</Label>
            <Input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Point Reward (Member)</Label>
            <Input
              value={form.point_reward_member}
              onChange={(e) => setForm((f) => ({ ...f, point_reward_member: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Point Reward (Trainer)</Label>
            <Input
              value={form.point_reward_trainer}
              onChange={(e) => setForm((f) => ({ ...f, point_reward_trainer: e.target.value }))}
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
              checked={form.is_available}
              onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))}
            />
            Available
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
            />
            Featured
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="h-40 w-40 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                ) : currentImageUrl ? (
                  <img src={currentImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                    No image
                  </div>
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

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                >
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

                {isNew ? <div className="w-full text-xs text-zinc-500">Save product first to upload image.</div> : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nutrition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            {(form.nutrition ?? []).map((n, idx) => (
              <div key={idx} className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={n.key}
                  placeholder="Key (e.g. protein_g)"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      nutrition: f.nutrition.map((x, i) => (i === idx ? { ...x, key: e.target.value } : x)),
                    }))
                  }
                />
                <Input
                  value={n.value}
                  placeholder="Value (number)"
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      nutrition: f.nutrition.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)),
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      nutrition: f.nutrition.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setForm((f) => ({ ...f, nutrition: [...(f.nutrition ?? []), { key: '', value: '' }] }))}
          >
            Add nutrition
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Modifiers</CardTitle>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setForm((f) => ({ ...f, modifiers: [...(f.modifiers ?? []), emptyModifier()] }))}
          >
            Add modifier
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {(form.modifiers ?? []).length ? (
            form.modifiers.map((m, mi) => (
              <Card key={mi} className="bg-zinc-950">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Modifier #{mi + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        modifiers: f.modifiers.filter((_, i) => i !== mi),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Name</Label>
                      <Input
                        value={m.name}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            modifiers: f.modifiers.map((x, i) => (i === mi ? { ...x, name: e.target.value } : x)),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={m.type}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            modifiers: f.modifiers.map((x, i) => (i === mi ? { ...x, type: v } : x)),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">single</SelectItem>
                          <SelectItem value="multiple">multiple</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sort</Label>
                      <Input
                        value={m.sort_order}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            modifiers: f.modifiers.map((x, i) =>
                              i === mi ? { ...x, sort_order: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={m.is_required}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          modifiers: f.modifiers.map((x, i) =>
                            i === mi ? { ...x, is_required: e.target.checked } : x,
                          ),
                        }))
                      }
                    />
                    Required
                  </label>

                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-zinc-200">Options</div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          modifiers: f.modifiers.map((x, i) =>
                            i === mi ? { ...x, options: [...(x.options ?? []), emptyOption()] } : x,
                          ),
                        }))
                      }
                    >
                      Add option
                    </Button>
                  </div>

                  {(m.options ?? []).length ? (
                    <div className="space-y-2">
                      {(m.options ?? []).map((o, oi) => (
                        <div key={oi} className="grid gap-2 md:grid-cols-12">
                          <div className="md:col-span-5">
                            <Input
                              placeholder="Option name"
                              value={o.name}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  modifiers: f.modifiers.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          options: (x.options ?? []).map((y, j) =>
                                            j === oi ? { ...y, name: e.target.value } : y,
                                          ),
                                        }
                                      : x,
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Input
                              placeholder="Additional price"
                              value={o.additional_price}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  modifiers: f.modifiers.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          options: (x.options ?? []).map((y, j) =>
                                            j === oi ? { ...y, additional_price: e.target.value } : y,
                                          ),
                                        }
                                      : x,
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              placeholder="Sort"
                              value={o.sort_order}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  modifiers: f.modifiers.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          options: (x.options ?? []).map((y, j) =>
                                            j === oi ? { ...y, sort_order: e.target.value } : y,
                                          ),
                                        }
                                      : x,
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2 md:col-span-1">
                            <input
                              type="checkbox"
                              checked={o.is_default}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  modifiers: f.modifiers.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          options: (x.options ?? []).map((y, j) =>
                                            j === oi ? { ...y, is_default: e.target.checked } : y,
                                          ),
                                        }
                                      : x,
                                  ),
                                }))
                              }
                              title="Default"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  modifiers: f.modifiers.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          options: (x.options ?? []).filter((_, j) => j !== oi),
                                        }
                                      : x,
                                  ),
                                }))
                              }
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-400">No options.</div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-sm text-zinc-400">No modifiers.</div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isNew ? (
          <Button
            type="button"
            variant="destructive"
            disabled={del.isPending}
            onClick={() => {
              if (!window.confirm('Delete this product?')) return
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
