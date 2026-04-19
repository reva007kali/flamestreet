import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Truck,
  X,
} from "lucide-react";

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function DeliveryBranches() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    city: "",
    province: "",
    lat: "",
    lng: "",
    is_active: true,
  });

  const query = useQuery({
    queryKey: ["admin", "delivery-branches"],
    queryFn: async () => (await api.get("/admin/delivery-branches")).data,
  });

  const branches = useMemo(() => query.data?.branches ?? [], [query.data]);

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        name: String(name ?? "").trim(),
        address: String(address ?? "").trim() || null,
        city: String(city ?? "").trim() || null,
        province: String(province ?? "").trim() || null,
        lat: toNum(lat),
        lng: toNum(lng),
        is_active: Boolean(isActive),
      };
      return (await api.post("/admin/delivery-branches", payload)).data.branch;
    },
    onSuccess: () => {
      setName("");
      setAddress("");
      setCity("");
      setProvince("");
      setLat("");
      setLng("");
      setIsActive(true);
      query.refetch();
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }) => {
      return (await api.put(`/admin/delivery-branches/${id}`, payload)).data
        .branch;
    },
    onSuccess: () => {
      setEditingId(null);
      query.refetch();
    },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/delivery-branches/${id}`);
    },
    onSuccess: () => query.refetch(),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
            <Truck className="h-8 w-8 text-[var(--accent)]" />
            Delivery Branches
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Cabang untuk hitung ongkir otomatis (nearest branch)
          </p>
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-800 shadow-2xl overflow-hidden rounded-[2rem]">
        <CardHeader className="bg-zinc-900/30 border-b border-zinc-900 px-6 py-4">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-[var(--accent)]" />
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Add Branch
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-12">
            <div className="md:col-span-4 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Name
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                placeholder="e.g. Cabang Sudirman"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="md:col-span-5 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Address
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                placeholder="Jl. ..."
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
                placeholder="Jakarta"
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
            <div className="md:col-span-3 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Latitude
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                placeholder="-6.2"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Longitude
              </Label>
              <Input
                className="bg-zinc-900 border-zinc-800 h-11"
                placeholder="106.81"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                Status
              </Label>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={[
                  "h-11 w-full rounded-xl border px-4 text-left text-xs font-black uppercase tracking-widest transition-all",
                  isActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-500",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-2">
                  <Activity size={14} /> {isActive ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
            <div className="md:col-span-12 flex items-center justify-end gap-2">
              <Button
                className="rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] font-black uppercase tracking-widest px-6 py-6"
                disabled={create.isPending}
                onClick={() => create.mutate()}
                type="button"
              >
                {create.isPending ? "Saving..." : "Create"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {branches.map((b) => {
          const isEditing = editingId === b.id;
          return (
            <Card
              key={b.id}
              className="bg-zinc-950 border-zinc-800 shadow-xl overflow-hidden rounded-[2rem]"
            >
              <CardHeader className="bg-zinc-900/20 border-b border-zinc-900 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-white">
                      {b.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-zinc-500">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={14} className="text-[var(--accent)]" />
                        {[
                          b.address,
                          b.city,
                          b.province,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                      <span className="text-zinc-800">•</span>
                      <span className="font-black tabular-nums text-zinc-400">
                        {Number(b.lat).toFixed(6)}, {Number(b.lng).toFixed(6)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                        b.is_active
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                          : "border-zinc-700 bg-zinc-900/40 text-zinc-500",
                      ].join(" ")}
                    >
                      {b.is_active ? "Active" : "Inactive"}
                    </span>
                    <Button
                      variant="outline"
                      className="rounded-xl border-zinc-800 bg-transparent text-zinc-300"
                      onClick={() => {
                        if (isEditing) {
                          setEditingId(null);
                          return;
                        }
                        setEditingId(b.id);
                        setEditForm({
                          name: b.name ?? "",
                          address: b.address ?? "",
                          city: b.city ?? "",
                          province: b.province ?? "",
                          lat: String(b.lat ?? ""),
                          lng: String(b.lng ?? ""),
                          is_active: Boolean(b.is_active),
                        });
                      }}
                      type="button"
                    >
                      {isEditing ? (
                        <X size={16} />
                      ) : (
                        <Pencil size={16} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => del.mutate(b.id)}
                      type="button"
                      disabled={del.isPending}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isEditing ? (
                <CardContent className="p-6">
                  <div className="grid gap-4 md:grid-cols-12">
                    <div className="md:col-span-4 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                        Name
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-11"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="md:col-span-5 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                        Address
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-11"
                        value={editForm.address}
                        onChange={(e) =>
                          setEditForm((s) => ({
                            ...s,
                            address: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                        City
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-11"
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, city: e.target.value }))
                        }
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                        Province
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-11"
                        value={editForm.province}
                        onChange={(e) =>
                          setEditForm((s) => ({
                            ...s,
                            province: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                        Latitude
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-11"
                        value={editForm.lat}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, lat: e.target.value }))
                        }
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                        Longitude
                      </Label>
                      <Input
                        className="bg-zinc-900 border-zinc-800 h-11"
                        value={editForm.lng}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, lng: e.target.value }))
                        }
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">
                        Status
                      </Label>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm((s) => ({ ...s, is_active: !s.is_active }))
                        }
                        className={[
                          "h-11 w-full rounded-xl border px-4 text-left text-xs font-black uppercase tracking-widest transition-all",
                          editForm.is_active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-500",
                        ].join(" ")}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Activity size={14} />{" "}
                          {editForm.is_active ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </div>

                    <div className="md:col-span-12 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl border-zinc-800 bg-transparent text-zinc-300"
                        onClick={() => setEditingId(null)}
                        type="button"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] font-black uppercase tracking-widest px-6 py-6"
                        onClick={() =>
                          update.mutate({
                            id: b.id,
                            payload: {
                              name: String(editForm.name ?? "").trim(),
                              address:
                                String(editForm.address ?? "").trim() || null,
                              city: String(editForm.city ?? "").trim() || null,
                              province:
                                String(editForm.province ?? "").trim() || null,
                              lat: toNum(editForm.lat),
                              lng: toNum(editForm.lng),
                              is_active: Boolean(editForm.is_active),
                            },
                          })
                        }
                        disabled={update.isPending}
                        type="button"
                      >
                        {update.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          );
        })}

        {!branches.length && !query.isLoading ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-10 text-center">
            <div className="text-sm font-black text-white">
              Belum ada cabang delivery
            </div>
            <div className="mt-1 text-xs font-semibold text-zinc-500">
              Tambahkan minimal 1 cabang untuk bisa hitung ongkir.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

