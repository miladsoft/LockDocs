'use client'

import { useState } from 'react'
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
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
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
            className="text-center tracking-[0.5em] text-lg bg-slate-800 border-slate-700 text-white"
            onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()}
          />

          <Button onClick={verify} loading={loading} disabled={code.length !== 6} className="w-full">
            Verify & Open Document
          </Button>

          <button
            onClick={resend}
            disabled={!sent}
            className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            {sent ? "Didn't receive a code? Resend" : 'Sending…'}
          </button>
        </div>
      </div>
    </div>
  )
}
