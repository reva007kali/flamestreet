import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'

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
    if (p.startsWith('uploads/')) return `${baseUrl}/${p}`
    return `${baseUrl}/storage/${p}`
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
      setUser(u)
      meQuery.refetch()
      setAvatarFile(null)
      setAvatarAction('keep')
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    },
  })

  const user = meQuery.data

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="font-medium">Avatar</div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="h-24 w-24 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : currentAvatarUrl && avatarAction !== 'delete' ? (
                <img src={currentAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-300">
                  {(user?.full_name ?? 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
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
              <Button type="button" variant="secondary" size="sm" onClick={() => avatarInputRef.current?.click()}>
                {user?.avatar || avatarPreview ? 'Replace' : 'Choose file'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!user?.avatar && !avatarPreview}
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
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="font-medium">Account</div>
          <div className="mt-1 text-sm text-zinc-400">{user?.email}</div>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <input
              className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2"
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <Button className="mt-4" type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button className="mt-2 w-full" type="button" variant="destructive" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}
