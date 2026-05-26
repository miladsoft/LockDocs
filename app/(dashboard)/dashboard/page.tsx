import Link from 'next/link'
import { Activity, Database, FileText, Share2, Upload } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { formatBytes, formatDate } from '@/lib/utils'
import { EmptyState, MetricCard, PageHeader, PageShell, StatusBadge, Surface } from '@/components/ui/surface'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function getRecentViewCutoff() {
  return new Date(Date.now() - THIRTY_DAYS_MS)
}

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
        where: { userId: session.sub, action: 'DOCUMENT_VIEWED', createdAt: { gte: getRecentViewCutoff() } },
      }),
    ]),
  ])

  const [docCount, activeShares, recentViews] = stats
  const storageUsed = Number(user?.storageUsed ?? 0)
  const storageLimit = Number(user?.storageLimit ?? 1)
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100))

  const statCards = [
    { label: 'Documents', value: docCount, helper: 'Encrypted assets', icon: FileText, tone: 'teal' as const },
    { label: 'Active Shares', value: activeShares, helper: 'Live access links', icon: Share2, tone: 'emerald' as const },
    { label: 'Views (30d)', value: recentViews, helper: 'Tracked events', icon: Activity, tone: 'indigo' as const },
    { label: 'Storage Used', value: `${storagePercent}%`, helper: formatBytes(storageUsed), icon: Database, tone: 'amber' as const },
  ]

  return (
    <PageShell>
      <PageHeader
        eyebrow="Security Command Center"
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Monitor protected documents, active shares, recent viewing activity and storage usage from one workspace."
        action={
          <Link
            href="/upload"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-teal-500 px-4 text-sm font-medium text-slate-950 transition-colors hover:bg-teal-400 focus-ring"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <Surface className="mb-8 p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-white">Storage posture</h2>
            <p className="mt-1 text-sm text-slate-500">Encrypted originals and rendered secure previews.</p>
          </div>
          <span className="text-sm text-slate-300">{formatBytes(storageUsed)} / {formatBytes(user?.storageLimit ?? 0)}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${storagePercent}%` }} />
        </div>
      </Surface>

      <Surface>
        <div className="flex items-center justify-between border-b border-slate-800/80 p-5">
          <h2 className="font-semibold text-white">Recent Documents</h2>
          <Link href="/documents" className="text-sm font-medium text-teal-300 hover:text-teal-200">
            View all
          </Link>
        </div>
        <div className="divide-y divide-slate-800">
          {recentDocuments.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={FileText}
                title="No documents yet"
                description="Upload a PDF, Office document or image to start creating secure share links."
                href="/upload"
                action="Upload first document"
              />
            </div>
          ) : (
            recentDocuments.map((doc: typeof recentDocuments[number]) => (
              <div key={doc.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-800/30 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <Link href={`/documents/${doc.id}`} className="block truncate text-sm font-medium text-slate-100 hover:text-teal-200">
                    {doc.title}
                  </Link>
                  <span className="text-xs text-slate-500">{formatDate(doc.createdAt)} - {formatBytes(Number(doc.fileSize))}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:ml-4">
                  <StatusBadge
                    className={
                      doc.status === 'READY' ? 'bg-emerald-400/10 text-emerald-300' :
                      doc.status === 'PROCESSING' ? 'bg-amber-400/10 text-amber-300' :
                      doc.status === 'FAILED' ? 'bg-red-400/10 text-red-300' :
                      'bg-slate-800 text-slate-400'
                    }
                  >
                    {doc.status}
                  </StatusBadge>
                  <span className="text-xs text-slate-500">{doc._count.shares} share{doc._count.shares !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Surface>
    </PageShell>
  )
}
