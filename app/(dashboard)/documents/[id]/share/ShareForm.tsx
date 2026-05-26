'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Check, CheckCircle2, Copy, Eye, Fingerprint, Mail, Printer, ShieldCheck, TextCursorInput, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Surface } from '@/components/ui/surface'

interface Props {
  documentId: string
  documentTitle: string
}

interface ShareResult {
  shareId: string
  shareUrl: string
}

const permissionItems = [
  ['showWatermark', 'Dynamic watermark', 'Overlay recipient, IP, timestamp and session data.', ShieldCheck],
  ['requiresOtp', 'OTP verification', 'Require a one-time email code before access.', Fingerprint],
  ['allowDownload', 'Allow download', 'Recipient can download the original file.', Eye],
  ['allowPrint', 'Allow print', 'Recipient can print the document.', Printer],
  ['allowCopy', 'Allow copy text', 'Recipient can copy text from the document.', TextCursorInput],
] as const

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
      <Surface className="mx-auto max-w-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-white">Share link created</p>
            <p className="mt-1 text-sm text-slate-500">Send this controlled access link to the recipient.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={result.shareUrl}
                className="min-h-10 min-w-0 flex-1 truncate rounded-lg border border-slate-700 bg-slate-950/55 px-3 font-mono text-sm text-slate-200"
              />
              <Button onClick={copyLink} variant="outline" size="sm">
                <Copy className="h-4 w-4" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setResult(null)} variant="ghost" size="sm">
                Create another
              </Button>
              <Button onClick={() => router.push(`/documents/${documentId}`)} variant="secondary" size="sm">
                Back to document
              </Button>
            </div>
          </div>
        </div>
      </Surface>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Surface className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-teal-300" />
            <h2 className="font-semibold text-white">Recipient</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">Message (optional)</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/55 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/70"
              placeholder="Please review this document..."
            />
          </div>
        </Surface>

        <Surface className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-300" />
            <h2 className="font-semibold text-white">Permissions</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {permissionItems.map(([key, label, desc, Icon]) => {
              const checked = form[key]

              return (
                <label
                  key={key}
                  className={`group flex min-h-[104px] cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    checked
                      ? 'border-teal-400/60 bg-teal-400/10'
                      : 'border-slate-800 bg-slate-950/35 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(key)} className="sr-only" />
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      checked
                        ? 'border-teal-300 bg-teal-400 text-slate-950'
                        : 'border-slate-700 bg-slate-800 text-slate-400 group-hover:border-slate-600'
                    }`}
                  >
                    {checked ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-100">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{desc}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </Surface>
      </div>

      <aside className="space-y-6">
        <Surface className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-300" />
            <h2 className="font-semibold text-white">Access limits</h2>
          </div>
          <div className="space-y-4">
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
        </Surface>

        <Surface className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-teal-300" />
            <h2 className="font-semibold text-white">Share summary</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-xs text-slate-500">Document</p>
              <p className="mt-1 truncate font-medium text-slate-200">{documentTitle}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-xs text-slate-500">Recipient</p>
              <p className="mt-1 truncate font-medium text-slate-200">{form.recipientEmail || 'Anyone with link'}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-xs text-slate-500">Protection</p>
              <p className="mt-1 text-slate-200">
                {form.showWatermark ? 'Watermark on' : 'Watermark off'} · {form.requiresOtp ? 'OTP on' : 'OTP off'}
              </p>
            </div>
          </div>
        </Surface>

        {error && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Generate Secure Link
        </Button>
      </aside>
    </form>
  )
}
