'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileUp, ShieldCheck, Tags, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatBytes } from '@/lib/utils'

const ACCEPTED = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp'

export function UploadZone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = useCallback((f: File) => {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
    setError('')
  }, [title])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }, [handleFileSelect])

  async function handleUpload() {
    if (!file) return setError('Please select a file')
    if (!title.trim()) return setError('Please enter a title')

    setUploading(true)
    setError('')
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('tags', tags.trim())

      // XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        })
        xhr.addEventListener('load', () => {
          const data = JSON.parse(xhr.responseText)
          if (data.success) resolve()
          else reject(new Error(data.error ?? 'Upload failed'))
        })
        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.open('POST', '/api/documents')
        xhr.send(formData)
      })

      router.push('/documents')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <div
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center shadow-2xl shadow-slate-950/20 transition-all sm:p-12 ${
            isDragging
              ? 'border-teal-400 bg-teal-400/10'
              : file
                ? 'border-emerald-500/80 bg-emerald-500/10'
                : 'border-slate-700 bg-slate-900/70 hover:border-teal-500/70 hover:bg-slate-900'
          }`}
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
          />

          {file ? (
            <div className="space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <p className="break-all text-sm font-medium text-emerald-300">{file.name}</p>
                <p className="mt-1 text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setTitle('') }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-red-300 focus-ring"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800 text-slate-300 ring-1 ring-slate-700">
                <FileUp className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Drop a file or <span className="text-teal-300">browse</span></p>
                <p className="mt-1 text-xs text-slate-500">PDF, DOCX, XLSX, JPEG, PNG, WebP up to 100MB</p>
              </div>
            </div>
          )}
        </div>

        <div className="surface rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <Tags className="h-4 w-4 text-teal-300" />
            <h2 className="font-semibold text-white">Document metadata</h2>
          </div>
          <div className="space-y-4">
            <Input
              label="Document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q4 Financial Report"
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/55 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 transition-colors focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/70"
                placeholder="Brief description..."
              />
            </div>
            <Input
              label="Tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="finance, confidential, 2026"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="surface rounded-xl p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-300" />
            <h2 className="font-semibold text-white">Security pipeline</h2>
          </div>
          <div className="space-y-3 text-sm">
            {['MIME and size validation', 'Encrypted object storage', 'Secure preview rendering', 'Watermark-ready pages'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/35 px-3 py-2 text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
      )}

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

        <Button onClick={handleUpload} loading={uploading} disabled={!file} className="w-full">
          Upload Document Securely
        </Button>
      </div>
    </div>
  )
}
