import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { formatBytes, formatDate } from '@/lib/utils'
import Link from 'next/link'

export const metadata = { title: 'Documents | Vaultix' }

export default async function DocumentsPage() {
  const session = await getSession()
  if (!session) return null

  const documents = await prisma.document.findMany({
    where: { userId: session.sub, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      originalFilename: true,
      mimeType: true,
      fileSize: true,
      pageCount: true,
      status: true,
      tags: true,
      createdAt: true,
      _count: { select: { shares: true } },
    },
  })

  const statusStyle: Record<string, string> = {
    READY:      'bg-emerald-950 text-emerald-400',
    PROCESSING: 'bg-amber-950 text-amber-400',
    PENDING:    'bg-slate-800 text-slate-400',
    FAILED:     'bg-red-950 text-red-400',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-slate-400 mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Upload
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-16 text-center">
          <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm mb-4">No documents yet</p>
          <Link href="/upload" className="text-indigo-400 hover:text-indigo-300 text-sm">
            Upload your first document →
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Title</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Size</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Pages</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Shares</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Uploaded</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-slate-200 font-medium truncate max-w-xs">{doc.title}</p>
                      <p className="text-slate-600 text-xs truncate max-w-xs">{doc.originalFilename}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                    {formatBytes(Number(doc.fileSize))}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {doc.pageCount || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[doc.status] ?? 'bg-slate-800 text-slate-400'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">
                    {doc._count.shares}
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
