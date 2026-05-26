'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

async function readApiError(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    return data.error ?? `Request failed with status ${res.status}`
  }
  return `Server error (${res.status}). Check the terminal logs.`
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push('/login')
      } else {
        setError(await readApiError(res))
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-dvh app-bg lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400 text-slate-950">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold text-white">Vaultix</span>
            </div>
            <p className="text-sm text-slate-400">Create a secure workspace</p>
          </div>

          <div className="surface rounded-2xl p-5 backdrop-blur sm:p-8">
            <div className="mb-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-400/20">
                <UserPlus className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold text-white">Create your account</h1>
              <p className="mt-1 text-sm text-slate-500">Start protecting confidential documents.</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Full name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              {error && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
              )}
              <Button type="submit" loading={loading} className="w-full">
                Create Account
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-teal-300 hover:text-teal-200">Sign in</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="hidden min-h-dvh flex-col justify-between border-l border-slate-800/70 p-8 lg:flex">
        <div />
        <div className="max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">Governed Sharing</p>
          <h2 className="text-5xl font-semibold tracking-tight text-white">Give teams a safer way to review sensitive files.</h2>
          <p className="mt-5 text-base leading-7 text-slate-400">
            Vaultix prepares every document for controlled previews, dynamic watermarking, OTP verification and forensic activity logs.
          </p>
        </div>
        <p className="text-xs text-slate-600">No raw originals are exposed through public links.</p>
      </section>
    </div>
  )
}
