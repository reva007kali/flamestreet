import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { homeForRoles } from '@/lib/roleHome'

export default function Login() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/login', { login, password })
      return res.data
    },
    onSuccess: (data) => {
      setSession(data.token, data.user)
      navigate(homeForRoles(data.user.roles), { replace: true })
    },
    onError: (e) => {
      setError(e?.response?.data?.message ?? 'Login failed')
    },
  })

  if (token && user) {
    return null
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to continue.</p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            mutation.mutate()
          }}
        >
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Email or username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error ? <div className="text-sm text-red-300">{error}</div> : null}

          <button
            type="submit"
            className="w-full rounded bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-sm text-zinc-400">
          No account?{' '}
          <Link className="text-[var(--accent)] hover:text-[var(--accent-hover)]" to="/register">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
