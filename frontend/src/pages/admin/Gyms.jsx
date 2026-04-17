import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Image as ImageIcon,
  Pencil,
  Trash2,
  X,
  MapPin,
  Plus,
  Building2,
  Activity,
} from "lucide-react";

export default function Gyms() {
  const [gymName, setGymName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    gym_name: "",
    address: "",
    city: "",
    province: "",
    is_active: true,
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    };
  }, [imagePreview, editImagePreview]);

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
  }, []);

  function imageUrl(path) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return path.startsWith("uploads/")
      ? `${baseUrl}/${path}`
      : `${baseUrl}/storage/${path}`;
  }

  const query = useQuery({
    queryKey: ["admin", "gyms"],
    queryFn: async () => (await api.get("/admin/gyms")).data,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/admin/gyms", {
        gym_name: gymName,
        address,
        city,
        province,
        is_active: isActive,
      });
      const gym = data.gym;
      if (imageFile) {
        const fd = new FormData();
        fd.append("image", imageFile);
        const res = await api.post(`/admin/gyms/${gym.id}/image`, fd);
        return res.data.gym;
      }
      return gym;
    },
    onSuccess: () => {
      setGymName("");
      setAddress("");
      setCity("");
      setProvince("");
      setIsActive(true);
      setImageFile(null);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      query.refetch();
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, payload, nextImageFile }) => {
      const { data } = await api.put(`/admin/gyms/${id}`, payload);
      let gym = data.gym;
      if (nextImageFile) {
        const fd = new FormData();
        fd.append("image", nextImageFile);
        const res = await api.post(`/admin/gyms/${id}/image`, fd);
        gym = res.data.gym;
      }
      return gym;
    },
    onSuccess: () => {
      setEditingId(null);
      setEditImageFile(null);
      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
      setEditImagePreview(null);
      query.refetch();
    },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/gyms/${id}`);
    },
    onSuccess: () => query.refetch(),
  });

  const delImage = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/gyms/${id}/image`);
    },
    onSuccess: () => query.refetch(),
  });

  const gyms = query.data?.data ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 sm:px-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-[var(--accent)]" />
            Gym Network
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Manage partner facilities and delivery coverage
          </p>
        </div>
      </div>

      {/* QUICK ADD SECTION */}
      <Card className="bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-zinc-900/30 border-b border-zinc-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-[var(--accent)]" />
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Register New Facility
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-4 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Facility Name
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                placeholder="e.g. Flame Gym Central"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
              />
            </div>
            <div className="md:col-span-5 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Street Address
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                placeholder="Jl. Sudirman No. 123"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                City
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                placeholder="Jakarta Selatan"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Province
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                placeholder="DKI Jakarta"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              />
            </div>
            <div className="md:col-span-6 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Facility Visual (Cover)
              </Label>
              <div className="flex flex-col gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  className="bg-zinc-900 border-zinc-800 h-11 text-xs file:bg-zinc-800 file:text-white file:border-none file:h-full file:mr-4"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setImageFile(f);
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImagePreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
                {imagePreview ? (
                  <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                    <div className="relative aspect-[16/8]">
                      <img
                        src={imagePreview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-white uppercase tracking-wider">
                            Preview
                          </div>
                          <div className="truncate text-[11px] font-semibold text-zinc-300">
                            {imageFile?.name ?? ""}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 rounded-xl bg-zinc-950/70 px-4 text-[10px] font-black uppercase text-zinc-200 hover:bg-zinc-900"
                          onClick={() => {
                            setImageFile(null);
                            if (imagePreview) URL.revokeObjectURL(imagePreview);
                            setImagePreview(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="md:col-span-3 flex items-end pb-3">
              <label className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800 cursor-pointer group">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-[var(--accent)] accent-[var(--accent)]"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-white transition-colors">
                  Visible in App
                </span>
              </label>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-900 flex justify-end">
            <Button
              className="bg-[var(--accent)] text-[var(--accent-foreground)] font-black uppercase tracking-widest px-10 h-12 rounded-xl shadow-lg shadow-[var(--accent)]/10 active:scale-95 transition-all"
              type="button"
              onClick={() => create.mutate()}
              disabled={!gymName || !address || !city || create.isPending}
            >
              {create.isPending ? "Processing..." : "Register Facility"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LIST SECTION */}
      <div className="grid gap-6 md:grid-cols-2">
        {gyms.map((g) => (
          <Card
            key={g.id}
            className="group overflow-hidden border-zinc-800 bg-zinc-950 shadow-xl transition-all duration-300 hover:border-[var(--accent)]/30"
          >
            {/* Image Section */}
            <div className="relative aspect-[16/8] overflow-hidden bg-zinc-900">
              {g.image ? (
                <img
                  src={imageUrl(g.image)}
                  alt={g.gym_name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-zinc-800">
                  <ImageIcon className="h-12 w-12 mb-2 opacity-10" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-20">
                    No Visual Asset
                  </span>
                </div>
              )}

              {/* Floating Badge Status */}
              <div className="absolute top-4 left-4">
                {g.is_active ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase tracking-widest backdrop-blur-md">
                    <Activity size={10} /> Operation Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[9px] font-black text-zinc-500 uppercase tracking-widest backdrop-blur-md">
                    <X size={10} /> Maintenance
                  </span>
                )}
              </div>
            </div>

            <CardHeader className="pb-4 px-6 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="text-lg font-black text-white uppercase italic tracking-tighter line-clamp-1">
                    {g.gym_name}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <MapPin size={10} className="text-[var(--accent)]" />{" "}
                    {g.city} {g.province && `• ${g.province}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800"
                    onClick={() => {
                      if (editingId === g.id) {
                        setEditingId(null);
                        setEditImageFile(null);
                        return;
                      }
                      setEditingId(g.id);
                      setEditImageFile(null);
                      if (editImagePreview)
                        URL.revokeObjectURL(editImagePreview);
                      setEditImagePreview(null);
                      setEditForm({
                        gym_name: g.gym_name ?? "",
                        address: g.address ?? "",
                        city: g.city ?? "",
                        province: g.province ?? "",
                        is_active: g.is_active ?? true,
                      });
                    }}
                  >
                    <Pencil
                      size={14}
                      className={
                        editingId === g.id
                          ? "text-[var(--accent)]"
                          : "text-zinc-400"
                      }
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-xl text-zinc-600 hover:text-red-500 hover:bg-red-500/10"
                    disabled={del.isPending}
                    onClick={() => {
                      if (window.confirm("Delete facility?")) del.mutate(g.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <div className="text-[11px] text-zinc-400 font-medium line-clamp-2 bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/50 italic">
                "{g.address}"
              </div>

              {/* INLINE EDIT FORM */}
              {editingId === g.id && (
                <div className="mt-6 pt-6 border-t border-zinc-900 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-zinc-500">
                        Facility Name
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        value={editForm.gym_name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, gym_name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-zinc-500">
                        City
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm({ ...editForm, city: e.target.value })
                        }
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-zinc-500">
                        Full Address
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        value={editForm.address}
                        onChange={(e) =>
                          setEditForm({ ...editForm, address: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase text-zinc-500">
                        Province
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-9 text-xs"
                        value={editForm.province}
                        onChange={(e) =>
                          setEditForm({ ...editForm, province: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-[var(--accent)]"
                          checked={editForm.is_active}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              is_active: e.target.checked,
                            })
                          }
                        />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">
                          Visible
                        </span>
                      </label>
                    </div>
                    <div className="md:col-span-2 space-y-2 pt-2">
                      <Label className="text-[9px] font-bold uppercase text-zinc-500">
                        Replace Cover Image
                      </Label>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            className="bg-zinc-900 border-zinc-800 h-9 text-[10px] flex-1"
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              setEditImageFile(f);
                              if (editImagePreview)
                                URL.revokeObjectURL(editImagePreview);
                              setEditImagePreview(
                                f ? URL.createObjectURL(f) : null,
                              );
                            }}
                          />
                          {g.image && !editImageFile ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 px-3 text-red-500 text-[10px] font-bold uppercase"
                              disabled={delImage.isPending}
                              onClick={() => {
                                if (window.confirm("Remove current image?"))
                                  delImage.mutate(g.id);
                              }}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                          <div className="relative aspect-[16/8]">
                            {editImagePreview ? (
                              <img
                                src={editImagePreview}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : g.image ? (
                              <img
                                src={imageUrl(g.image)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center text-zinc-800">
                                <ImageIcon className="h-10 w-10 mb-2 opacity-10" />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-20">
                                  No Visual Asset
                                </span>
                              </div>
                            )}
                            {editImagePreview ? (
                              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 py-3">
                                <div className="min-w-0">
                                  <div className="truncate text-[10px] font-black text-white uppercase tracking-wider">
                                    Preview
                                  </div>
                                  <div className="truncate text-[11px] font-semibold text-zinc-300">
                                    {editImageFile?.name ?? ""}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-9 rounded-xl bg-zinc-950/70 px-4 text-[10px] font-black uppercase text-zinc-200 hover:bg-zinc-900"
                                  onClick={() => {
                                    setEditImageFile(null);
                                    if (editImagePreview)
                                      URL.revokeObjectURL(editImagePreview);
                                    setEditImagePreview(null);
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-500 font-bold uppercase text-[10px]"
                      onClick={() => {
                        setEditingId(null);
                        setEditImageFile(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-[var(--accent)] text-[var(--accent-foreground)] font-black uppercase text-[10px] tracking-widest h-9 px-6 rounded-lg"
                      disabled={update.isPending}
                      onClick={() => {
                        update.mutate({
                          id: g.id,
                          payload: editForm,
                          nextImageFile: editImageFile,
                        });
                      }}
                    >
                      {update.isPending ? "Saving..." : "Confirm Update"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
