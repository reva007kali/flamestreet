import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { homeForRoles } from '@/lib/roleHome'

const REF_KEY = 'flamestreet_ref'

export default function Register() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const setSession = useAuthStore((s) => s.setSession)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('member')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const ref = search.get('ref')
    if (ref) {
      localStorage.setItem(REF_KEY, ref)
    }
    const stored = localStorage.getItem(REF_KEY) ?? ''
    if (stored) setReferralCode(stored)
  }, [search])

  const payload = useMemo(() => {
    const base = {
      full_name: fullName,
      username,
      phone_number: phoneNumber,
      email,
      password,
      role,
    }

    if (dateOfBirth) base.date_of_birth = dateOfBirth
    if (role === 'member' && referralCode) base.referral_code = referralCode
    return base
  }, [fullName, username, phoneNumber, email, password, role, dateOfBirth, referralCode])

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/register', payload)
      return res.data
    },
    onSuccess: (data) => {
      if (role === 'member') localStorage.removeItem(REF_KEY)
      setSession(data.token, data.user)
      navigate(homeForRoles(data.user.roles), { replace: true })
    },
    onError: (e) => {
      setError(e?.response?.data?.message ?? 'Register failed')
    },
  })

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">Register</h1>
        <p className="mt-2 text-sm text-zinc-400">Create your account.</p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            mutation.mutate()
          }}
        >
          <select
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="member">Member</option>
            <option value="trainer">Trainer</option>
          </select>

          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Date of birth (YYYY-MM-DD)"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          {role === 'member' ? (
            <input
              className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
              placeholder="Referral code (optional)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
          ) : null}

          {error ? <div className="text-sm text-red-300">{error}</div> : null}

          <button
            type="submit"
            className="w-full rounded bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-sm text-zinc-400">
          Already have account?{' '}
          <Link className="text-[var(--accent)] hover:text-[var(--accent-hover)]" to="/login">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
