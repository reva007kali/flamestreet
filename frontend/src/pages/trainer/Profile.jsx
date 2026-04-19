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
  AtSign,
  KeyRound,
  FileText,
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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarAction, setAvatarAction] = useState("keep");
  const avatarInputRef = useRef(null);
  const [saveError, setSaveError] = useState(null);
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (!meQuery.data) return;
    setFullName(meQuery.data.full_name ?? "");
    setPhoneNumber(meQuery.data.phone_number ?? "");
    setUsername(meQuery.data.username ?? "");
    setEmail(meQuery.data.email ?? "");
    setBio(meQuery.data?.trainer_profile?.bio ?? "");
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
      const u = meQuery.data ?? null;
      const nextUsername = String(username ?? "").trim();
      const nextEmail = String(email ?? "").trim();
      const needCurrentPw =
        (nextUsername && nextUsername !== String(u?.username ?? "")) ||
        (nextEmail && nextEmail !== String(u?.email ?? "")) ||
        Boolean(newPassword);

      if (needCurrentPw && !String(currentPassword ?? "").trim()) {
        const err = new Error("Current password required");
        err.code = "CURRENT_PASSWORD_REQUIRED";
        throw err;
      }

      const profilePayload = {
        full_name: fullName,
        phone_number: phoneNumber,
        username: nextUsername,
        email: nextEmail,
        trainer_bio: bio,
        current_password: needCurrentPw ? currentPassword : undefined,
      };

      let nextUser = (
        await api.put("/me/profile", profilePayload)
      ).data.user;

      if (newPassword) {
        await api.put("/me/password", {
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: newPasswordConfirm,
        });
        setNewPassword("");
        setNewPasswordConfirm("");
      }

      if (avatarAction === "delete") {
        nextUser = (await api.delete("/me/avatar")).data.user;
      } else if (avatarAction === "new" && avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        nextUser = (await api.post("/me/avatar", fd)).data.user;
      }

      return nextUser;
    },
    onSuccess: (u) => {
      setSaveError(null);
      setSaveOk(true);
      setUser(u);
      meQuery.refetch();
      setAvatarFile(null);
      setAvatarAction("keep");
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    },
    onError: (e) => {
      if (e?.code === "CURRENT_PASSWORD_REQUIRED") {
        setSaveError("Masukkan current password untuk simpan perubahan ini.");
        return;
      }
      const msg =
        e?.response?.data?.message ??
        e?.response?.data?.errors?.email?.[0] ??
        e?.response?.data?.errors?.username?.[0] ??
        e?.response?.data?.errors?.phone_number?.[0] ??
        e?.response?.data?.errors?.flamehub_bio?.[0] ??
        e?.response?.data?.errors?.trainer_bio?.[0] ??
        e?.response?.data?.errors?.current_password?.[0] ??
        e?.response?.data?.errors?.password?.[0] ??
        "Gagal menyimpan profile.";
      setSaveError(String(msg));
    },
  });

  const tp = meQuery.data?.trainer_profile;
  const user = meQuery.data;

  useEffect(() => {
    if (!saveOk) return;
    const t = window.setTimeout(() => setSaveOk(false), 2000);
    return () => window.clearTimeout(t);
  }, [saveOk]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-10 px-4 sm:px-0">
      <div className="sticky top-0 z-30 -mx-4 border-b border-zinc-900 bg-zinc-950/85 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:border-zinc-800">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-white italic uppercase tracking-tight">
              Coach Profile
            </h1>
            <p className="truncate text-[11px] font-semibold text-zinc-500">
              Edit account, bio, photo, dan keamanan dari satu tempat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="rounded-2xl bg-[var(--accent)] px-5 py-5 text-[11px] font-black uppercase tracking-widest text-[var(--accent-foreground)] shadow-2xl shadow-[var(--accent)]/20 active:scale-95 transition-all disabled:opacity-60"
              type="button"
              onClick={() => {
                setSaveOk(false);
                setSaveError(null);
                save.mutate();
              }}
              disabled={save.isPending}
            >
              {save.isPending ? (
                <span className="flex items-center gap-2 italic">Saving…</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save size={16} /> Save
                </span>
              )}
            </Button>
          </div>
        </div>
        {saveError ? (
          <div className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
            {saveError}
          </div>
        ) : saveOk ? (
          <div className="mt-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
            Saved.
          </div>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: VISUAL IDENTITY & TRAINER STATS */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Identity Card */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-gradient-to-br from-emerald-800/20 via-zinc-950 to-black p-8 flex flex-col items-center text-center shadow-xl">
            <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute -left-10 -bottom-10 h-44 w-44 rounded-full bg-black/40 blur-3xl" />

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
              {((user?.avatar && avatarAction !== "delete") || avatarPreview) ? (
                <button
                  type="button"
                  onClick={() => setAvatarAction("delete")}
                  className="absolute left-1 top-1 grid h-9 w-9 place-items-center rounded-full border-4 border-zinc-950 bg-red-500/15 text-red-300 hover:bg-red-500/25"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-1 right-1 h-9 w-9 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full border-4 border-zinc-950 flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="mt-5">
              <h3 className="text-xl font-black text-white flex items-center justify-center gap-2 uppercase italic tracking-tighter">
                {user?.full_name ?? "Trainer"}
                <BadgeCheck
                  size={20}
                  className="text-emerald-500 fill-emerald-500/10"
                />
              </h3>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                <ShieldCheck size={12} /> Verified Trainer
              </div>
            </div>

            <div className="mt-8 w-full grid gap-3">
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
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
                  Account
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/55">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <AtSign size={12} className="text-emerald-400/90" />
                    @{user?.username ?? "-"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    <Mail size={12} className="text-emerald-400/90" />
                    {user?.email ?? "-"}
                  </span>
                </div>
              </div>
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
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <Mail size={12} /> Email Address
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-zinc-700"
                    placeholder="email@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
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

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <AtSign size={12} /> Username
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-zinc-700"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
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
                    autoComplete="tel"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                    <FileText size={12} /> Bio
                  </label>
                  <textarea
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-zinc-700"
                    placeholder="Ceritakan style coaching kamu…"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                  <div className="text-[10px] font-semibold text-zinc-500">
                    {String(bio ?? "").length}/2000
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-5">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-[var(--accent)]" />
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Security
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <input
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-zinc-700"
                      placeholder="Current password (required untuk email/username/password)"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      type="password"
                      autoComplete="current-password"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-zinc-700"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        type="password"
                        autoComplete="new-password"
                      />
                      <input
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 text-sm text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-zinc-700"
                        placeholder="Confirm new password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        type="password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="destructive"
                  className="w-full rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all py-6"
                  onClick={() => logout()}
                >
                  <LogOut size={18} className="mr-2" /> Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
