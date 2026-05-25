'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { DocumentMeta } from '@/types'

interface SecureViewerProps {
  document: DocumentMeta
  token: string
  email?: string
  name?: string
}

export function SecureViewer({ document: documentMeta, token, email, name }: SecureViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [isBlurred, setIsBlurred] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Block context menu, drag, keyboard shortcuts
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()
    const blockKeys = (e: KeyboardEvent) => {
      const forbidden = [
        e.ctrlKey && e.key === 'p', // print
        e.ctrlKey && e.key === 's', // save
        e.ctrlKey && e.key === 'c', // copy
        e.ctrlKey && e.key === 'u', // view source
        e.ctrlKey && e.shiftKey && e.key === 'I', // devtools
        e.key === 'PrintScreen',
        e.metaKey && e.key === 'p',
        e.metaKey && e.key === 's',
      ]
      if (!documentMeta.allowPrint && (e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        return
      }
      if (!documentMeta.allowCopy && (e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        return
      }
      if (forbidden.some(Boolean)) e.preventDefault()
    }

    window.document.addEventListener('contextmenu', block)
    window.addEventListener('keydown', blockKeys)
    window.addEventListener('dragstart', block)

    return () => {
      window.document.removeEventListener('contextmenu', block)
      window.removeEventListener('keydown', blockKeys)
      window.removeEventListener('dragstart', block)
    }
  }, [documentMeta.allowPrint, documentMeta.allowCopy])

  // Blur on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (window.document.hidden) {
        setIsBlurred(true)
      } else {
        setIsBlurred(false)
      }
    }
    window.document.addEventListener('visibilitychange', handleVisibility)
    return () => window.document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // DevTools detection via console timing
  useEffect(() => {
    let devToolsOpen = false
    const threshold = 160

    const check = () => {
      const before = performance.now()
      console.profile()
      console.profileEnd()
      const after = performance.now()
      if (after - before > threshold && !devToolsOpen) {
        devToolsOpen = true
        fetch('/api/viewer/suspicious', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, type: 'DEVTOOLS_DETECTED', sessionId }),
        }).catch(() => {})
      }
    }

    const id = setInterval(check, 3000)
    return () => clearInterval(id)
  }, [token, sessionId])

  const loadPage = useCallback(
    async (page: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const params = new URLSearchParams({
        token,
        pageNumber: String(page),
        sessionId,
        ...(email && { email }),
        ...(name && { name }),
      })

      const res = await fetch(`/api/viewer/page?${params}`)
      if (!res.ok) return

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const img = new Image()

      img.onload = () => {
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
      }
      img.src = url
    },
    [token, sessionId, email, name],
  )

  useEffect(() => {
    loadPage(currentPage)
  }, [currentPage, loadPage])

  const goTo = (page: number) => {
    if (page >= 1 && page <= documentMeta.pageCount) setCurrentPage(page)
  }

  const downloadUrl = `/api/viewer/download?${new URLSearchParams({
    token,
    sessionId,
  })}`

  return (
    <div
      ref={containerRef}
      className="flex h-dvh flex-col bg-slate-950 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 max-w-full truncate font-semibold text-white sm:max-w-xs">{documentMeta.title}</span>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>
            {currentPage} / {documentMeta.pageCount}
          </span>
          {documentMeta.allowDownload && (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-1.5 rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
        </div>
      </header>

      {/* Viewer area */}
      <main className="relative flex flex-1 items-center justify-center overflow-auto p-3 sm:p-4">
        {isBlurred && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl">
            <p className="text-white text-lg font-medium">Click to resume viewing</p>
          </div>
        )}

        <div
          className="relative shadow-2xl"
          style={{ pointerEvents: isBlurred ? 'none' : 'auto' }}
          onClick={() => setIsBlurred(false)}
        >
          <canvas
            ref={canvasRef}
            className="max-h-[calc(100dvh-210px)] max-w-full object-contain sm:max-h-[calc(100dvh-160px)]"
          />
          {/* Anti-screenshot overlay — transparent but breaks copy-paste */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ mixBlendMode: 'multiply', opacity: 0.001, background: 'white' }}
          />
        </div>
      </main>

      {/* Navigation */}
      <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-800 bg-slate-900 px-3 py-3 sm:gap-4 sm:px-4">
        <button
          onClick={() => goTo(1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          &#171; First
        </button>
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          &#8249; Prev
        </button>

        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={documentMeta.pageCount}
            value={currentPage}
            onChange={(e) => goTo(parseInt(e.target.value) || 1)}
            className="w-14 text-center bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-sm"
          />
          <span className="text-slate-500 text-sm">/ {documentMeta.pageCount}</span>
        </div>

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === documentMeta.pageCount}
          className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          Next &#8250;
        </button>
        <button
          onClick={() => goTo(documentMeta.pageCount)}
          disabled={currentPage === documentMeta.pageCount}
          className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          Last &#187;
        </button>
      </footer>
    </div>
  )
}
