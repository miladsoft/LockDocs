import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { formatBytes, formatDate } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'Document | Vaultix' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function DocumentPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params

  const doc = await prisma.document.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(session.role !== 'ADMIN' && { userId: session.sub }),
    },
    include: {
      pages: { select: { pageNumber: true, isRendered: true }, orderBy: { pageNumber: 'asc' } },
      shares: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          recipientEmail: true,
          recipientName: true,
          expiresAt: true,
          currentViews: true,
          maxViews: true,
          allowDownload: true,
          allowPrint: true,
          showWatermark: true,
          requiresOtp: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!doc) return notFound()

  const statusStyle: Record<string, string> = {
    READY:      'bg-emerald-950 text-emerald-400',
    PROCESSING: 'bg-amber-950 text-amber-400',
    PENDING:    'bg-slate-800 text-slate-400',
    FAILED:     'bg-red-950 text-red-400',
    DELETED:    'bg-red-950 text-red-400',
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
            <Link href="/documents" className="hover:text-slate-300">Documents</Link>
            <span>/</span>
            <span className="text-slate-300 truncate">{doc.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-white truncate">{doc.title}</h1>
          {doc.description && <p className="text-slate-400 mt-1">{doc.description}</p>}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusStyle[doc.status] ?? 'bg-slate-800 text-slate-400'}`}>
          {doc.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h2 className="font-semibold text-white mb-4">Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['File', doc.originalFilename],
                ['Size', formatBytes(Number(doc.fileSize))],
                ['Type', doc.mimeType],
                ['Pages', doc.pageCount || '—'],
                ['Uploaded', formatDate(doc.createdAt)],
                ['Checksum', doc.checksum ? doc.checksum.slice(0, 16) + '…' : '—'],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-slate-200 font-mono text-xs mt-0.5 truncate">{value}</dd>
                </div>
              ))}
            </dl>

            {doc.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-slate-500 text-xs mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pages */}
          {doc.pages.length > 0 && (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h2 className="font-semibold text-white mb-3">Pages ({doc.pages.length})</h2>
              <div className="flex flex-wrap gap-2">
                {doc.pages.map((p) => (
                  <span
                    key={p.pageNumber}
                    className={`w-8 h-8 rounded text-xs flex items-center justify-center ${
                      p.isRendered ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                    }`}
                    title={p.isRendered ? 'Rendered' : 'Pending'}
                  >
                    {p.pageNumber}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Active shares */}
          <div className="bg-slate-900 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h2 className="font-semibold text-white">Active Shares ({doc.shares.length})</h2>
            </div>
            {doc.shares.length === 0 ? (
              <p className="px-5 py-6 text-slate-500 text-sm text-center">No active shares</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {doc.shares.map((share) => (
                  <div key={share.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">
                        {share.recipientEmail ?? 'Anyone with link'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {share.currentViews}{share.maxViews ? `/${share.maxViews}` : ''} views
                        {share.expiresAt ? ` · expires ${formatDate(share.expiresAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                      {share.showWatermark && <span className="text-slate-500">Watermark</span>}
                      {share.requiresOtp && <span className="text-amber-500">OTP</span>}
                      {share.allowDownload && <span className="text-indigo-400">Download</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
            <h2 className="font-semibold text-white mb-2">Actions</h2>
            <Link
              href={`/documents/${id}/share`}
              className="flex items-center gap-2 w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Share Document
            </Link>
            {doc.status === 'READY' && (
              <p className="text-xs text-slate-500 text-center">
                Document ready — {doc.pageCount} page{doc.pageCount !== 1 ? 's' : ''}
              </p>
            )}
            {doc.status === 'PENDING' || doc.status === 'PROCESSING' ? (
              <p className="text-xs text-amber-500 text-center">Processing… refresh in a moment</p>
            ) : null}
            {doc.status === 'FAILED' && (
              <p className="text-xs text-red-400 text-center">Rendering failed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
