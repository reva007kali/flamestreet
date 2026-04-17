import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Camera, LogOut, Mail, Phone, User as UserIcon, Trash2, Save, BadgeCheck } from 'lucide-react'

export default function Profile() {
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/me')).data.user,
  })

  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarAction, setAvatarAction] = useState('keep')
  const avatarInputRef = useRef(null)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  useEffect(() => {
    if (!meQuery.data) return
    setFullName(meQuery.data.full_name ?? '')
    setPhoneNumber(meQuery.data.phone_number ?? '')
  }, [meQuery.data])

  const baseUrl = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? ''
    return apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl
  }, [])

  const currentAvatarUrl = useMemo(() => {
    const p = meQuery.data?.avatar
    if (!p) return null
    if (/^https?:\/\//i.test(p)) return p
    return p.startsWith('uploads/') ? `${baseUrl}/${p}` : `${baseUrl}/storage/${p}`
  }, [baseUrl, meQuery.data?.avatar])

  const save = useMutation({
    mutationFn: async () => {
      if (avatarAction === 'delete') {
        await api.delete('/me/avatar')
      } else if (avatarAction === 'new' && avatarFile) {
        const fd = new FormData()
        fd.append('avatar', avatarFile)
        await api.post('/me/avatar', fd)
      }
      return (await api.put('/me/profile', { full_name: fullName, phone_number: phoneNumber })).data.user
    },
    onSuccess: (u) => {
      setSaveError(null)
      setUser(u)
      meQuery.refetch()
      setAvatarFile(null)
      setAvatarAction('keep')
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    },
    onError: (e) => {
      const msg =
        e?.response?.data?.errors?.avatar?.[0] ??
        e?.response?.data?.message ??
        'Gagal menyimpan profile.'
      setSaveError(msg)
    },
  })

  const user = meQuery.data

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Profile Settings</h1>
        <p className="text-sm text-zinc-500">Update your personal information and profile picture.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT: Avatar Side */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-zinc-900 bg-zinc-900 shadow-xl transition-transform group-hover:scale-[1.02]">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : currentAvatarUrl && avatarAction !== 'delete' ? (
                  <img src={currentAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl font-bold text-zinc-500">
                    {(user?.full_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-1 right-1 h-9 w-9 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-full border-4 border-zinc-950 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="mt-5">
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
                {user?.full_name}
                <BadgeCheck size={16} className="text-emerald-500" />
              </h3>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mt-1">@{user?.username}</p>
            </div>

            <div className="mt-8 w-full space-y-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setAvatarFile(file)
                  if (avatarPreview) URL.revokeObjectURL(avatarPreview)
                  setAvatarPreview(file ? URL.createObjectURL(file) : null)
                  setAvatarAction(file ? 'new' : 'keep')
                }}
              />
              <Button 
                variant="outline" 
                className="w-full rounded-xl border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900" 
                onClick={() => avatarInputRef.current?.click()}
              >
                Change Photo
              </Button>
              
              {(user?.avatar || avatarPreview) && (
                 <Button
                  variant="ghost"
                  className="w-full rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => {
                    if (avatarPreview) {
                      setAvatarFile(null)
                      URL.revokeObjectURL(avatarPreview)
                      setAvatarPreview(null)
                      if (avatarInputRef.current) avatarInputRef.current.value = ''
                      setAvatarAction('keep')
                      return
                    }
                    setAvatarAction('delete')
                  }}
                >
                  <Trash2 size={14} className="mr-2" /> Remove
                </Button>
              )}
            </div>
          </div>

          <Button 
            variant="destructive" 
            className="w-full rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all py-6"
            onClick={() => logout()}
          >
            <LogOut size={18} className="mr-2" /> Logout Account
          </Button>
        </div>

        {/* RIGHT: Form Side */}
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-zinc-900">
                <UserIcon size={18} className="text-[var(--accent)]" />
                <h2 className="font-bold text-white">Personal Information</h2>
              </div>

              {/* Email (Disabled) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <Mail size={12} /> Email Address
                </label>
                <input
                  disabled
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-zinc-500 cursor-not-allowed"
                  value={user?.email ?? ''}
                />
                <p className="text-[10px] text-zinc-600 italic">Email cannot be changed manually.</p>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Full Name</label>
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                  <Phone size={12} /> Phone Number
                </label>
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                  placeholder="e.g. 08123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="pt-4">
                {saveError ? (
                  <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {saveError}
                  </div>
                ) : null}
                <Button 
                  className="w-full sm:w-auto px-10 py-6 rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] font-bold hover:brightness-110 shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50"
                  type="button" 
                  onClick={() => {
                    setSaveError(null)
                    save.mutate()
                  }} 
                  disabled={save.isPending}
                >
                  {save.isPending ? (
                    <div className="flex items-center gap-2">
                       <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                       Saving Changes...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save size={18} /> Save Profile
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
