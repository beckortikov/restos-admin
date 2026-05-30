'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error ?? 'Login failed')
      }
      router.push('/')
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">RestOS Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Issue and manage licenses</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</div>}
        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
