'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { DocumentMeta } from '@/types'

interface SecureViewerProps {
  document: DocumentMeta
  token: string
  email?: string
  name?: string
}

export function SecureViewer({ document, token, email, name }: SecureViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [isBlurred, setIsBlurred] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sessionStart = useRef(Date.now())

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
      if (!document.allowPrint && (e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        return
      }
      if (!document.allowCopy && (e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        return
      }
      if (forbidden.some(Boolean)) e.preventDefault()
    }

    document.addEventListener?.('contextmenu', block)
    window.addEventListener('keydown', blockKeys)
    window.addEventListener('dragstart', block)

    return () => {
      document.removeEventListener?.('contextmenu', block)
      window.removeEventListener('keydown', blockKeys)
      window.removeEventListener('dragstart', block)
    }
  }, [document.allowPrint, document.allowCopy])

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
      // eslint-disable-next-line no-console
      console.profile()
      // eslint-disable-next-line no-console
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
    if (page >= 1 && page <= document.pageCount) setCurrentPage(page)
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-screen bg-slate-950 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <span className="text-white font-semibold truncate max-w-xs">{document.title}</span>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span>
            {currentPage} / {document.pageCount}
          </span>
          {document.allowDownload && (
            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">
              Download allowed
            </span>
          )}
        </div>
      </header>

      {/* Viewer area */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
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
            className="max-w-full max-h-[calc(100vh-160px)] object-contain"
            style={{ imageRendering: 'high-quality' }}
          />
          {/* Anti-screenshot overlay — transparent but breaks copy-paste */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ mixBlendMode: 'multiply', opacity: 0.001, background: 'white' }}
          />
        </div>
      </main>

      {/* Navigation */}
      <footer className="flex items-center justify-center gap-4 px-4 py-3 bg-slate-900 border-t border-slate-800">
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
            max={document.pageCount}
            value={currentPage}
            onChange={(e) => goTo(parseInt(e.target.value) || 1)}
            className="w-14 text-center bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 text-sm"
          />
          <span className="text-slate-500 text-sm">/ {document.pageCount}</span>
        </div>

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === document.pageCount}
          className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          Next &#8250;
        </button>
        <button
          onClick={() => goTo(document.pageCount)}
          disabled={currentPage === document.pageCount}
          className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-sm disabled:opacity-40 hover:bg-slate-700 transition-colors"
        >
          Last &#187;
        </button>
      </footer>
    </div>
  )
}
