'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  documentId: string
  documentTitle: string
}

interface ShareResult {
  shareId: string
  shareUrl: string
}

export function ShareForm({ documentId, documentTitle }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ShareResult | null>(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    recipientName: '',
    recipientEmail: '',
    message: '',
    allowDownload: false,
    allowPrint: false,
    allowCopy: false,
    showWatermark: true,
    requiresOtp: false,
    expiresAt: '',
    maxViews: '',
  })

  function toggle(key: 'allowDownload' | 'allowPrint' | 'allowCopy' | 'showWatermark' | 'requiresOtp') {
    setForm((f) => ({ ...f, [key]: !f[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const body = {
      documentId,
      recipientName: form.recipientName || undefined,
      recipientEmail: form.recipientEmail || undefined,
      message: form.message || undefined,
      allowDownload: form.allowDownload,
      allowPrint: form.allowPrint,
      allowCopy: form.allowCopy,
      showWatermark: form.showWatermark,
      requiresOtp: form.requiresOtp,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      maxViews: form.maxViews ? parseInt(form.maxViews) : undefined,
    }

    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!data) {
        setError(res.ok ? 'Unexpected server response' : `Server error (${res.status})`)
        return
      }
      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error ?? 'Failed to create share')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!result) return
    await navigator.clipboard.writeText(result.shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Share link created</p>
            <p className="text-slate-400 text-sm">Send this link to the recipient</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            readOnly
            value={result.shareUrl}
            className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 font-mono truncate"
          />
          <Button onClick={copyLink} variant="outline" size="sm">
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={() => setResult(null)} variant="ghost" size="sm">
            Create another
          </Button>
          <Button onClick={() => router.push(`/documents/${documentId}`)} variant="secondary" size="sm">
            Back to document
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Recipient */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <h2 className="font-semibold text-white">Recipient</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Name (optional)"
            value={form.recipientName}
            onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            placeholder="Jane Smith"
          />
          <Input
            label="Email (optional)"
            type="email"
            value={form.recipientEmail}
            onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
            placeholder="jane@company.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-400">Message (optional)</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Please review this document..."
          />
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <h2 className="font-semibold text-white">Permissions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ['showWatermark', 'Show watermark', 'Overlay dynamic watermark with recipient info'],
            ['requiresOtp', 'Require OTP', 'Recipient must verify via one-time code'],
            ['allowDownload', 'Allow download', 'Recipient can download the original file'],
            ['allowPrint', 'Allow print', 'Recipient can print the document'],
            ['allowCopy', 'Allow copy text', 'Recipient can copy text from the document'],
          ] as const).map(([key, label, desc]) => {
            const checked = form[key]

            return (
              <label
                key={key}
                className={`group flex min-h-[84px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  checked
                    ? 'border-indigo-500/70 bg-indigo-500/10'
                    : 'border-slate-800 bg-slate-950/35 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(key)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    checked
                      ? 'border-indigo-400 bg-indigo-500 text-white'
                      : 'border-slate-600 bg-slate-800 text-transparent group-hover:border-slate-500'
                  }`}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-100">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Limits */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
        <h2 className="font-semibold text-white">Limits</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Expiry date (optional)"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <Input
            label="Max views (optional)"
            type="number"
            min="1"
            value={form.maxViews}
            onChange={(e) => setForm({ ...form, maxViews: e.target.value })}
            placeholder="Unlimited"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Generate Secure Link
      </Button>
    </form>
  )
}
