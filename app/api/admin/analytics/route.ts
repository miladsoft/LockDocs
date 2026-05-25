import { requireSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { ok, unauthorized, forbidden } from '@/lib/api/response'

export async function GET(req: Request): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const url = new URL(req.url)
  const days = Math.min(90, parseInt(url.searchParams.get('days') ?? '30'))
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    totalDocuments,
    activeShares,
    recentLogs,
    suspiciousEvents,
    topDocuments,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.share.count({ where: { status: 'ACTIVE' } }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
        document: { select: { title: true } },
      },
    }),
    prisma.suspiciousEvent.findMany({
      where: { resolved: false, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.auditLog.groupBy({
      by: ['documentId'],
      where: { action: 'DOCUMENT_VIEWED', createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ])

  // Activity by day
  const activityByDay = await prisma.$queryRaw<{ date: string; count: number }[]>`
    SELECT DATE(created_at)::text as date, COUNT(*)::int as count
    FROM audit_logs
    WHERE created_at >= ${since}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `

  return ok({
    stats: { totalUsers, totalDocuments, activeShares },
    recentLogs,
    suspiciousEvents,
    topDocuments,
    activityByDay,
  })
}
