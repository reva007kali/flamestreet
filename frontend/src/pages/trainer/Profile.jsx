import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  Camera,
  LogOut,
  Mail,
  Phone,
  User as UserIcon,
  Trash2,
  Save,
  BadgeCheck,
  Trophy,
  QrCode,
  ShieldCheck,
} from "lucide-react";

export default function Profile() {
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/me")).data.user,
  });

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarAction, setAvatarAction] = useState("keep");
  const avatarInputRef = useRef(null);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!meQuery.data) return;
    setFullName(meQuery.data.full_name ?? "");
    setPhoneNumber(meQuery.data.phone_number ?? "");
  }, [meQuery.data]);

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    return apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
  }, []);

  const currentAvatarUrl = useMemo(() => {
    const p = meQuery.data?.avatar;
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    return p.startsWith("uploads/")
      ? `${baseUrl}/${p}`
      : `${baseUrl}/storage/${p}`;
  }, [baseUrl, meQuery.data?.avatar]);

  const save = useMutation({
    mutationFn: async () => {
      if (avatarAction === "delete") {
        await api.delete("/me/avatar");
      } else if (avatarAction === "new" && avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        await api.post("/me/avatar", fd);
      }
      return (
        await api.put("/me/profile", {
          full_name: fullName,
          phone_number: phoneNumber,
        })
      ).data.user;
    },
    onSuccess: (u) => {
      setSaveError(null);
      setUser(u);
      meQuery.refetch();
      setAvatarFile(null);
      setAvatarAction("keep");
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.errors?.avatar?.[0] ??
        e?.response?.data?.message ??
        "Gagal menyimpan profile.";
      setSaveError(msg);
    },
  });

  const tp = meQuery.data?.trainer_profile;
  const user = meQuery.data;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 px-4 sm:px-0">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">
          Coach Profile
        </h1>
        <p className="text-sm text-zinc-500">
          Manage your trainer identity and account preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: VISUAL IDENTITY & TRAINER STATS */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Identity Card */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-8 flex flex-col items-center text-center shadow-xl">
            <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-[var(--accent)] opacity-[0.05] blur-3xl" />

            <div className="relative group">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-zinc-900 bg-zinc-900 shadow-2xl">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : currentAvatarUrl && avatarAction !== "delete" ? (
                  <img
                    src={currentAvatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl font-bold text-[var(--accent)]">
                    {(user?.full_name ?? "T").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-1 right-1 h-9 w-9 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full border-4 border-zinc-950 flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="mt-5">
              <h3 className="text-xl font-black text-white flex items-center justify-center gap-2 uppercase italic tracking-tighter">
                {user?.full_name}
                <BadgeCheck
                  size={20}
                  className="text-emerald-500 fill-emerald-500/10"
                />
              </h3>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                <ShieldCheck size={12} /> Verified Trainer
              </div>
            </div>

            <div className="mt-8 w-full grid grid-cols-2 gap-3">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setAvatarFile(file);
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                  setAvatarPreview(file ? URL.createObjectURL(file) : null);
                  setAvatarAction(file ? "new" : "keep");
                }}
              />
              <Button
                variant="outline"
                className="rounded-xl border-zinc-800 bg-transparent text-xs font-bold text-zinc-400"
                onClick={() => avatarInputRef.current?.click()}
              >
                Change Photo
              </Button>

              <Button
                variant="ghost"
                className="rounded-xl text-xs font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                disabled={!user?.avatar && !avatarPreview}
                onClick={() => {
                  if (avatarPreview) {
                    setAvatarFile(null);
                    URL.revokeObjectURL(avatarPreview);
                    setAvatarPreview(null);
                    setAvatarAction("keep");
                    return;
                  }
                  setAvatarAction("delete");
                }}
              >
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
            </div>
          </div>

          {/* Trainer Business Info Card */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
            <div className="flex items-center gap-2 text-zinc-500">
              <QrCode size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Trainer Credentials
              </span>
            </div>

            <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
              <div>
                <div className="text-[11px] font-bold text-zinc-500 uppercase">
                  Referral Code
                </div>
                <div className="text-lg font-black text-white tracking-tighter uppercase">
                  {tp?.referral_code ?? "-"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-zinc-500 uppercase flex items-center justify-end gap-1">
                  <Trophy size={10} /> Tier Status
                </div>
                <div className="text-lg font-black text-[var(--accent)] tracking-tighter uppercase">
                  {tp?.tier ?? "-"}
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              className="w-full rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all py-6 mt-4"
              onClick={() => logout()}
            >
              <LogOut size={18} className="mr-2" /> Logout
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: ACCOUNT FORM */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10 shadow-xl">
            <div className="space-y-8">
              <div className="flex items-center gap-2 pb-4 border-b border-zinc-900">
                <UserIcon size={20} className="text-[var(--accent)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Account Details
                </h2>
              </div>

              <div className="grid gap-6">
                {/* Email Address */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <Mail size={12} /> Email Address
                  </label>
                  <div className="relative">
                    <input
                      disabled
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/30 px-5 py-4 text-zinc-500 cursor-not-allowed text-sm"
                      value={user?.email ?? ""}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <ShieldCheck size={16} className="text-zinc-700" />
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Coach Full Name
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-zinc-700"
                    placeholder="e.g. Coach Jackson"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <Phone size={12} /> Contact Number
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-zinc-700"
                    placeholder="e.g. 08123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-6">
                {saveError ? (
                  <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {saveError}
                  </div>
                ) : null}
                <Button
                  className="w-full sm:w-auto px-12 py-7 rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] font-black uppercase tracking-widest hover:brightness-110 shadow-2xl shadow-[var(--accent)]/20 active:scale-95 transition-all disabled:opacity-50"
                  type="button"
                  onClick={() => {
                    setSaveError(null);
                    save.mutate();
                  }}
                  disabled={save.isPending}
                >
                  {save.isPending ? (
                    <span className="flex items-center gap-2 italic">
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save size={18} /> Update Profile
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
