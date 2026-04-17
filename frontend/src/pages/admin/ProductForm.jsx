import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  LayoutGrid,
  DollarSign,
  Utensils,
  Settings2,
  X,
} from "lucide-react";

// ... (logic helpers: emptyModifier, emptyOption, nullIfEmpty, nutritionEntriesFromObject tetap sama)
function emptyModifier() {
  return {
    name: "",
    type: "single",
    is_required: false,
    sort_order: 0,
    options: [],
  };
}
function emptyOption() {
  return { name: "", additional_price: 0, is_default: false, sort_order: 0 };
}
function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
function nutritionEntriesFromObject(obj) {
  const base = obj && typeof obj === "object" ? obj : {};
  const entries = Object.entries(base).map(([k, v]) => ({
    key: String(k),
    value: v == null ? "" : String(v),
  }));
  return entries.length ? entries : [{ key: "protein_g", value: "0" }];
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const categoriesQuery = useQuery({
    queryKey: ["admin", "product-categories"],
    queryFn: async () => (await api.get("/admin/product-categories")).data.data,
  });

  const productQuery = useQuery({
    enabled: !isNew,
    queryKey: ["admin", "product", id],
    queryFn: async () => (await api.get(`/admin/products/${id}`)).data.product,
  });

  const [form, setForm] = useState({
    category_id: "",
    name: "",
    slug: "",
    description: "",
    ingredients: "",
    hpp: 0,
    price: 0,
    image: "",
    images: [],
    weight_gram: "",
    point_reward_member: 0,
    point_reward_trainer: 0,
    sort_order: 0,
    is_available: true,
    is_featured: false,
    nutrition: [{ key: "protein_g", value: "0" }],
    modifiers: [],
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
  }, []);

  const currentImageUrl = useMemo(() => {
    const p = form.image;
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return p.startsWith("uploads/")
      ? `${baseUrl}/${p}`
      : `${baseUrl}/storage/${p}`;
  }, [baseUrl, form.image]);

  useEffect(() => {
    if (!productQuery.data) return;
    const p = productQuery.data;
    setForm({
      category_id: p.category_id ?? "",
      name: p.name ?? "",
      slug: p.slug ?? "",
      description: p.description ?? "",
      ingredients: p.ingredients ?? "",
      hpp: Number(p.hpp ?? 0),
      price: Number(p.price ?? 0),
      image: p.image ?? "",
      images: Array.isArray(p.images) ? p.images : [],
      weight_gram: p.weight_gram ?? "",
      point_reward_member: Number(p.point_reward_member ?? p.point_reward ?? 0),
      point_reward_trainer: Number(
        p.point_reward_trainer ?? p.point_reward ?? 0,
      ),
      sort_order: Number(p.sort_order ?? 0),
      is_available: Boolean(p.is_available),
      is_featured: Boolean(p.is_featured),
      nutrition: nutritionEntriesFromObject(p.nutritional_info),
      modifiers: (p.modifiers ?? []).map((m) => ({
        name: m.name ?? "",
        type: m.type ?? "single",
        is_required: Boolean(m.is_required),
        sort_order: Number(m.sort_order ?? 0),
        options: (m.options ?? []).map((o) => ({
          name: o.name ?? "",
          additional_price: Number(o.additional_price ?? 0),
          is_default: Boolean(o.is_default),
          sort_order: Number(o.sort_order ?? 0),
        })),
      })),
    });
  }, [productQuery.data]);

  const payload = useMemo(() => {
    const modifiers = (form.modifiers ?? [])
      .map((m) => ({
        name: String(m.name ?? "").trim(),
        type: m.type ?? "single",
        is_required: Boolean(m.is_required),
        sort_order: Number(m.sort_order ?? 0),
        options: (m.options ?? [])
          .map((o) => ({
            name: String(o.name ?? "").trim(),
            additional_price: Number(o.additional_price ?? 0),
            is_default: Boolean(o.is_default),
            sort_order: Number(o.sort_order ?? 0),
          }))
          .filter((o) => o.name.length),
      }))
      .filter((m) => m.name.length);

    const nutritional_info = (form.nutrition ?? []).reduce((acc, it) => {
      const k = String(it?.key ?? "").trim();
      if (!k.length) return acc;
      const n = Number(it?.value ?? 0);
      if (!Number.isFinite(n)) return acc;
      acc[k] = n;
      return acc;
    }, {});

    return {
      category_id: Number(form.category_id),
      name: String(form.name ?? "").trim(),
      slug: String(form.slug ?? "").trim(),
      description: nullIfEmpty(form.description),
      ingredients: nullIfEmpty(form.ingredients),
      nutritional_info: Object.keys(nutritional_info).length
        ? nutritional_info
        : null,
      hpp: Number(form.hpp),
      price: Number(form.price),
      image: nullIfEmpty(form.image),
      images:
        Array.isArray(form.images) && form.images.length ? form.images : null,
      weight_gram: form.weight_gram === "" ? null : Number(form.weight_gram),
      is_available: Boolean(form.is_available),
      is_featured: Boolean(form.is_featured),
      sort_order: Number(form.sort_order ?? 0),
      point_reward: Number(form.point_reward_member ?? 0),
      point_reward_member: Number(form.point_reward_member ?? 0),
      point_reward_trainer: Number(form.point_reward_trainer ?? 0),
      modifiers: modifiers.length ? modifiers : null,
    };
  }, [form]);

  const save = useMutation({
    mutationFn: async () => {
      if (isNew)
        return (await api.post("/admin/products", payload)).data.product;
      return (await api.put(`/admin/products/${id}`, payload)).data.product;
    },
    onSuccess: () => navigate("/admin/products"),
  });

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/products/${id}`);
    },
    onSuccess: () => navigate("/admin/products"),
  });

  const uploadImage = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error("No file");
      const fd = new FormData();
      fd.append("image", imageFile);
      return (await api.post(`/admin/products/${id}/image`, fd)).data;
    },
    onSuccess: (data) => {
      setForm((f) => ({ ...f, image: data.image ?? "" }));
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    },
  });

  const deleteImage = useMutation({
    mutationFn: async () =>
      (await api.delete(`/admin/products/${id}/image`)).data,
    onSuccess: () => {
      setForm((f) => ({ ...f, image: "" }));
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/admin/products">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              {isNew ? "New Product" : "Edit Product"}
            </h1>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Product Catalog Management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => {
                if (window.confirm("Delete this product?")) del.mutate();
              }}
              disabled={del.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          )}
          <Button
            className="bg-[var(--accent)] text-[var(--accent-foreground)] font-bold px-8 shadow-lg shadow-[var(--accent)]/20"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Product
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: MAIN CONTENT */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-900 bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">
                  Basic Information
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Product Name
                  </Label>
                  <Input
                    placeholder="e.g. Chicken Protein Bowl"
                    className="bg-zinc-900 border-zinc-800"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Slug (URL)
                  </Label>
                  <Input
                    placeholder="chicken-protein-bowl"
                    className="bg-zinc-900 border-zinc-800"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }
                    onBlur={() => {
                      if (form.slug.trim()) return;
                      const s = form.name
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                      setForm((f) => ({ ...f, slug: s }));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Description
                </Label>
                <Textarea
                  rows={4}
                  placeholder="Describe your product benefits..."
                  className="bg-zinc-900 border-zinc-800 resize-none"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Ingredients
                </Label>
                <Textarea
                  placeholder="List all materials..."
                  className="bg-zinc-900 border-zinc-800 resize-none"
                  value={form.ingredients}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ingredients: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-900 bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">
                  Customization / Modifiers
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-800 h-8 text-[10px] font-black uppercase"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    modifiers: [...f.modifiers, emptyModifier()],
                  }))
                }
              >
                <Plus className="h-3 w-3 mr-1" /> Add Modifier
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {!form.modifiers.length ? (
                <div className="py-10 text-center border-2 border-dashed border-zinc-900 rounded-2xl">
                  <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                    No Modifiers Added
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {form.modifiers.map((m, mi) => (
                    <div
                      key={mi}
                      className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-4 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="grid grid-cols-2 gap-3 flex-1">
                          <Input
                            placeholder="Modifier Group Name"
                            className="bg-zinc-950 h-9 text-sm"
                            value={m.name}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                modifiers: f.modifiers.map((x, i) =>
                                  i === mi ? { ...x, name: e.target.value } : x,
                                ),
                              }))
                            }
                          />
                          <Select
                            value={m.type}
                            onValueChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                modifiers: f.modifiers.map((x, i) =>
                                  i === mi ? { ...x, type: v } : x,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger className="bg-zinc-950 h-9 text-xs uppercase font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">
                                Single Choice
                              </SelectItem>
                              <SelectItem value="multiple">
                                Multiple Choice
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-zinc-600 hover:text-red-500"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              modifiers: f.modifiers.filter((_, i) => i !== mi),
                            }))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <Label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">
                            Options
                          </Label>
                          <button
                            className="text-[9px] font-black uppercase text-[var(--accent)]"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                modifiers: f.modifiers.map((x, i) =>
                                  i === mi
                                    ? {
                                        ...x,
                                        options: [...x.options, emptyOption()],
                                      }
                                    : x,
                                ),
                              }))
                            }
                          >
                            + Add Option
                          </button>
                        </div>
                        {m.options.map((o, oi) => (
                          <div key={oi} className="grid grid-cols-12 gap-2">
                            <Input
                              className="col-span-6 bg-zinc-950 h-8 text-xs"
                              placeholder="Name"
                              value={o.name}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  modifiers: f.modifiers.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          options: x.options.map((y, j) =>
                                            j === oi
                                              ? { ...y, name: e.target.value }
                                              : y,
                                          ),
                                        }
                                      : x,
                                  ),
                                }))
                              }
                            />
                            <Input
                              className="col-span-4 bg-zinc-950 h-8 text-xs"
                              placeholder="+ Price"
                              value={o.additional_price}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  modifiers: f.modifiers.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          options: x.options.map((y, j) =>
                                            j === oi
                                              ? {
                                                  ...y,
                                                  additional_price:
                                                    e.target.value,
                                                }
                                              : y,
                                          ),
                                        }
                                      : x,
                                  ),
                                }))
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="col-span-2 h-8 w-8"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  modifiers: f.modifiers.map((x, i) =>
                                    i === mi
                                      ? {
                                          ...x,
                                          options: x.options.filter(
                                            (_, j) => j !== oi,
                                          ),
                                        }
                                      : x,
                                  ),
                                }))
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: SETTINGS & ASSETS */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-900 bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">
                  Media Asset
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="relative aspect-square rounded-2xl border-2 border-dashed border-zinc-900 bg-zinc-900/20 overflow-hidden flex flex-col items-center justify-center group">
                {imagePreview || currentImageUrl ? (
                  <img
                    src={imagePreview || currentImageUrl}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-zinc-800" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-[10px] font-black uppercase"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Change
                  </Button>
                  {(form.image || imagePreview) && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-[10px] font-black uppercase"
                      onClick={() => {
                        if (imagePreview) {
                          setImagePreview(null);
                          setImageFile(null);
                        } else if (window.confirm("Delete image?"))
                          deleteImage.mutate();
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setImageFile(f);
                  setImagePreview(f ? URL.createObjectURL(f) : null);
                }}
              />
              {imageFile && (
                <Button
                  className="w-full h-8 text-[10px] font-black uppercase"
                  onClick={() => uploadImage.mutate()}
                  disabled={uploadImage.isPending}
                >
                  {uploadImage.isPending ? "Uploading..." : "Confirm Upload"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-900 bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">
                  Pricing & Status
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Product Price (IDR)
                </Label>
                <Input
                  className="bg-zinc-900 border-zinc-800 font-bold"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Category
                </Label>
                <Select
                  value={String(form.category_id)}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category_id: v }))
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 font-bold">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categoriesQuery.data || []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-900 bg-zinc-900/30">
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={form.is_available}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_available: e.target.checked }))
                    }
                  />
                  <span className="text-[10px] font-black uppercase text-zinc-400">
                    Available
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-900 bg-zinc-900/30">
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={form.is_featured}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_featured: e.target.checked }))
                    }
                  />
                  <span className="text-[10px] font-black uppercase text-zinc-400">
                    Featured
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-900 bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle className="text-sm font-black uppercase tracking-widest text-zinc-400">
                  Nutrition Facts
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {form.nutrition.map((n, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    placeholder="Key"
                    className="bg-zinc-900 border-zinc-800 h-8 text-[11px]"
                    value={n.key}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        nutrition: f.nutrition.map((x, i) =>
                          i === idx ? { ...x, key: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                  <Input
                    placeholder="Value"
                    className="bg-zinc-900 border-zinc-800 h-8 text-[11px]"
                    value={n.value}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        nutrition: f.nutrition.map((x, i) =>
                          i === idx ? { ...x, value: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        nutrition: f.nutrition.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full h-8 text-[10px] font-black uppercase border-zinc-800"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    nutrition: [...f.nutrition, { key: "", value: "" }],
                  }))
                }
              >
                Add Nutrition
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
