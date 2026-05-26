'use client'

import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface OtpGateProps {
  email: string
  onVerified: () => void
  token: string
}

export function OtpGate({ email, onVerified, token }: OtpGateProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(true)

  async function verify() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, purpose: 'doc_access' }),
      })
      const data = await res.json()
      if (data.success) {
        onVerified()
      } else {
        setError(data.error ?? 'Invalid code')
      }
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setSent(false)
    await fetch('/api/viewer/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
    setSent(true)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center app-bg p-4">
      <div className="surface w-full max-w-sm rounded-2xl p-5 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-400/20">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-white">Verify your identity</h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter the 6-digit code sent to <span className="break-all text-slate-200">{email}</span>
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label="Access code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            placeholder="000000"
            error={error}
            className="bg-slate-950/55 text-center text-lg tracking-[0.5em] text-white"
            onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()}
          />

          <Button onClick={verify} loading={loading} disabled={code.length !== 6} className="w-full">
            Verify & Open Document
          </Button>

          <button
            onClick={resend}
            disabled={!sent}
            className="w-full text-sm text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50 focus-ring"
          >
            {sent ? "Didn't receive a code? Resend" : 'Sending…'}
          </button>
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Session verification required
          </div>
        </div>
      </div>
    </div>
  )
}
