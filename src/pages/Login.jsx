import { useState } from 'react'

export default function Login({ authApi }) {
  const { login, error, setError } = authApi
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    await login(email.trim(), password)
    setBusy(false)
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#2a0f1f] to-[#12060d] p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-pink-500/20 bg-black/30 p-8 shadow-2xl backdrop-blur"
      >
        <div className="mb-6 text-center">
          <div className="text-5xl">💘</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-pink-200">
            Heart Wars
          </h1>
          <p className="mt-1 text-sm text-pink-300/60">Sign in to battle.</p>
        </div>

        <label className="mb-1 block text-xs font-medium text-pink-200/70">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError(null)
          }}
          className="mb-4 w-full rounded-lg border border-pink-500/20 bg-black/40 px-3 py-2 text-pink-50 outline-none focus:border-pink-400/60"
          placeholder="you@example.com"
        />

        <label className="mb-1 block text-xs font-medium text-pink-200/70">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(null)
          }}
          className="mb-4 w-full rounded-lg border border-pink-500/20 bg-black/40 px-3 py-2 text-pink-50 outline-none focus:border-pink-400/60"
          placeholder="••••••••"
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-pink-500 px-4 py-2.5 font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-4 text-center text-xs text-pink-300/40">
          Accounts are pre-created — there is no sign-up.
        </p>
      </form>
    </div>
  )
}
