'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }, [])

  function handleFileSelect(f: File) {
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
    setError('')
  }

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
    <div className="space-y-6 max-w-2xl">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/30'
            : file
              ? 'border-emerald-600 bg-emerald-950/20'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900'
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
          <div className="space-y-2">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-emerald-400">{file.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setTitle('') }}
              className="text-xs text-slate-500 hover:text-red-400 underline mt-1"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm text-slate-300">Drop a file or <span className="text-indigo-400">browse</span></p>
            <p className="text-xs text-slate-500">PDF, DOCX, XLSX, JPEG, PNG, WebP — up to 100MB</p>
          </div>
        )}
      </div>

      {/* Metadata form */}
      <div className="space-y-4">
        <Input
          label="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Q4 Financial Report"
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-400">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Brief description..."
          />
        </div>
        <Input
          label="Tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="finance, confidential, 2024"
        />
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
  )
}
