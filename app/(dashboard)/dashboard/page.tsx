import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { formatBytes, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const [user, recentDocuments, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { name: true, storageUsed: true, storageLimit: true },
    }),
    prisma.document.findMany({
      where: { userId: session.sub, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, fileSize: true, createdAt: true, _count: { select: { shares: true } } },
    }),
    prisma.$transaction([
      prisma.document.count({ where: { userId: session.sub, deletedAt: null } }),
      prisma.share.count({ where: { document: { userId: session.sub }, status: 'ACTIVE' } }),
      prisma.auditLog.count({
        where: { userId: session.sub, action: 'DOCUMENT_VIEWED', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]),
  ])

  const [docCount, activeShares, recentViews] = stats
  const storageUsed = Number(user?.storageUsed ?? 0)
  const storageLimit = Number(user?.storageLimit ?? 1)
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100))

  const statCards = [
    { label: 'Documents', value: docCount, color: 'indigo' },
    { label: 'Active Shares', value: activeShares, color: 'emerald' },
    { label: 'Views (30d)', value: recentViews, color: 'violet' },
    { label: 'Storage Used', value: `${storagePercent}%`, color: 'amber' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-slate-400 mt-1">Here&apos;s an overview of your document security activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <p className="text-slate-400 text-sm">{card.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Storage Bar */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 mb-8">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Storage</span>
          <span className="text-slate-300">
            {formatBytes(storageUsed)} / {formatBytes(user?.storageLimit ?? 0)}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all"
            style={{ width: `${storagePercent}%` }}
          />
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-slate-900 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="font-semibold text-white">Recent Documents</h2>
          <Link href="/documents" className="text-sm text-indigo-400 hover:text-indigo-300">View all</Link>
        </div>
        <div className="divide-y divide-slate-800">
          {recentDocuments.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-500 text-sm mb-4">No documents yet</p>
              <Link href="/upload" className="text-indigo-400 hover:text-indigo-300 text-sm">
                Upload your first document →
              </Link>
            </div>
          ) : (
            recentDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/documents/${doc.id}`}
                    className="text-sm font-medium text-slate-200 hover:text-white truncate block"
                  >
                    {doc.title}
                  </Link>
                  <span className="text-xs text-slate-500">{formatDate(doc.createdAt)} · {formatBytes(Number(doc.fileSize))}</span>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    doc.status === 'READY' ? 'bg-emerald-950 text-emerald-400' :
                    doc.status === 'PROCESSING' ? 'bg-amber-950 text-amber-400' :
                    doc.status === 'FAILED' ? 'bg-red-950 text-red-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>{doc.status}</span>
                  <span className="text-xs text-slate-500">{doc._count.shares} share{doc._count.shares !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
