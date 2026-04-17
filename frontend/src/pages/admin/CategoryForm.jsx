import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  Save,
  Trash2,
  Image as ImageIcon,
  Layers,
  Settings2,
  Upload,
  X,
  Sparkles,
} from "lucide-react";

function nullIfEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export default function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const categoryQuery = useQuery({
    enabled: !isNew,
    queryKey: ["admin", "product-category", id],
    queryFn: async () =>
      (await api.get(`/admin/product-categories/${id}`)).data.category,
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    sort_order: 0,
    is_active: true,
    image: "",
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
    if (!categoryQuery.data) return;
    const c = categoryQuery.data;
    setForm({
      name: c.name ?? "",
      slug: c.slug ?? "",
      description: c.description ?? "",
      sort_order: Number(c.sort_order ?? 0),
      is_active: Boolean(c.is_active),
      image: c.image ?? "",
    });
  }, [categoryQuery.data]);

  const payload = useMemo(
    () => ({
      name: String(form.name ?? "").trim(),
      slug: String(form.slug ?? "").trim(),
      description: nullIfEmpty(form.description),
      sort_order: Number(form.sort_order ?? 0),
      is_active: Boolean(form.is_active),
      image: nullIfEmpty(form.image),
    }),
    [form],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (isNew)
        return (await api.post("/admin/product-categories", payload)).data
          .category;
      return (await api.put(`/admin/product-categories/${id}`, payload)).data
        .category;
    },
    onSuccess: () => navigate("/admin/categories"),
  });

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/product-categories/${id}`);
    },
    onSuccess: () => navigate("/admin/categories"),
  });

  const uploadImage = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error("No file");
      const fd = new FormData();
      fd.append("image", imageFile);
      return (await api.post(`/admin/product-categories/${id}/image`, fd)).data;
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
      (await api.delete(`/admin/product-categories/${id}/image`)).data,
    onSuccess: () => {
      setForm((f) => ({ ...f, image: "" }));
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/admin/categories">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              {isNew ? "New Category" : "Edit Category"}
            </h1>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Layers size={12} /> Category Configuration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold text-xs"
              onClick={() => {
                if (window.confirm("Delete this category?")) del.mutate();
              }}
              disabled={del.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          )}
          <Button
            className="bg-[var(--accent)] text-[var(--accent-foreground)] font-black uppercase tracking-widest px-8 shadow-lg shadow-[var(--accent)]/20 active:scale-95 transition-all"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: PRIMARY INFO */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900/30 border-b border-zinc-900 px-6 py-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--accent)]" />
                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Identity Details
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1">
                    Display Name
                  </Label>
                  <Input
                    className="bg-zinc-900 border-zinc-800 focus:border-[var(--accent)] transition-all h-11"
                    placeholder="e.g. Protein Bowls"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1">
                    URL Slug
                  </Label>
                  <Input
                    className="bg-zinc-900 border-zinc-800 focus:border-[var(--accent)] transition-all h-11 font-mono text-xs"
                    placeholder="protein-bowls"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }
                    onBlur={() => {
                      if (String(form.slug ?? "").trim().length) return;
                      const next = String(form.name ?? "")
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                      if (next) setForm((f) => ({ ...f, slug: next }));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1">
                  Detailed Description
                </Label>
                <Textarea
                  className="bg-zinc-900 border-zinc-800 focus:border-[var(--accent)] transition-all min-h-[140px] resize-none"
                  placeholder="Describe what kind of products belong here..."
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: ASSETS & STATUS */}
        <div className="lg:col-span-5 space-y-6">
          {/* IMAGE CARD */}
          <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900/30 border-b border-zinc-900 px-6 py-4">
              <div className="flex items-center gap-2">
                <ImageIcon size={16} className="text-[var(--accent)]" />
                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Category Visual
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-center">
              <div className="relative group mx-auto">
                <div className="h-48 w-full overflow-hidden rounded-2xl border-2 border-dashed border-zinc-900 bg-zinc-900/20 transition-all flex flex-col items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : currentImageUrl ? (
                    <img
                      src={currentImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-700">
                      <ImageIcon size={40} strokeWidth={1.5} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        No Visual Asset
                      </span>
                    </div>
                  )}

                  {/* OVERLAY ACTIONS */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 rounded-lg text-[10px] font-bold uppercase"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {form.image || imagePreview ? "Replace" : "Choose File"}
                    </Button>
                    {(form.image || imagePreview) && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                        disabled={isNew || deleteImage.isPending}
                        onClick={() => {
                          if (imagePreview) {
                            setImageFile(null);
                            setImagePreview(null);
                            if (imageInputRef.current)
                              imageInputRef.current.value = "";
                            return;
                          }
                          if (window.confirm("Delete image?"))
                            deleteImage.mutate();
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                  if (imagePreview) URL.revokeObjectURL(imagePreview);
                  setImagePreview(file ? URL.createObjectURL(file) : null);
                }}
              />

              {imageFile && (
                <Button
                  className="w-full h-10 rounded-xl font-bold text-xs"
                  onClick={() => uploadImage.mutate()}
                  disabled={uploadImage.isPending || isNew}
                >
                  <Upload size={14} className="mr-2" />{" "}
                  {uploadImage.isPending ? "Uploading..." : "Confirm Upload"}
                </Button>
              )}

              {isNew && (
                <p className="text-[10px] text-zinc-600 italic">
                  Please save category before uploading media assets.
                </p>
              )}
            </CardContent>
          </Card>

          {/* SETTINGS CARD */}
          <Card className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-900/30 border-b border-zinc-900 px-6 py-4">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-[var(--accent)]" />
                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  Settings & Visibility
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-1">
                  Display Order
                </Label>
                <Input
                  type="number"
                  className="bg-zinc-900 border-zinc-800 h-10 font-bold"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-900 bg-zinc-900/40 transition-colors">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    Visibility Status
                  </span>
                  <span className="text-[10px] text-zinc-500 italic">
                    Visible on member app
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)] peer-checked:after:bg-white"></div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
