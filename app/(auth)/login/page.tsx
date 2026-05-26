'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
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

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
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
    <div className="grid min-h-dvh app-bg lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden min-h-dvh flex-col justify-between border-r border-slate-800/70 p-8 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-950/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none text-white">Vaultix</p>
            <p className="mt-1 text-xs text-slate-500">Enterprise secure document sharing</p>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">Secure Data Room</p>
          <h1 className="text-5xl font-semibold tracking-tight text-white">Control every document after it leaves your workspace.</h1>
          <p className="mt-5 text-base leading-7 text-slate-400">
            Share sensitive files with encrypted storage, secure previews, dynamic watermarking, OTP gates and complete audit visibility.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
            {['Watermarked previews', 'Revocable links', 'Audit trails'].map((item) => (
              <div key={item} className="rounded-xl border border-slate-800 bg-slate-900/55 p-4 text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">Built for confidential finance, legal and enterprise review workflows.</p>
      </section>

      <section className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-3 inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400 text-slate-950">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-xl font-semibold text-white">Vaultix</span>
            </div>
            <p className="text-sm text-slate-400">Secure Document Sharing Platform</p>
          </div>

          <div className="surface rounded-2xl p-5 backdrop-blur sm:p-8">
            <div className="mb-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-400/20">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold text-white">Sign in to your account</h1>
              <p className="mt-1 text-sm text-slate-500">Access your secure document workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />

              {error && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Sign In
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-teal-300 hover:text-teal-200">
                Register
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">Protected by enterprise-grade encryption</p>
        </div>
      </section>
    </div>
  )
}
