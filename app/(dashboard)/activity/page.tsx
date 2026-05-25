import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Activity Log | Vaultix' }

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  DOCUMENT_VIEWED: { label: 'Viewed', color: 'text-blue-400' },
  DOCUMENT_DOWNLOADED: { label: 'Downloaded', color: 'text-indigo-400' },
  DOCUMENT_PRINTED: { label: 'Printed', color: 'text-violet-400' },
  PAGE_VIEWED: { label: 'Page viewed', color: 'text-slate-400' },
  SHARE_CREATED: { label: 'Share created', color: 'text-emerald-400' },
  SHARE_REVOKED: { label: 'Share revoked', color: 'text-red-400' },
  ACCESS_GRANTED: { label: 'Access granted', color: 'text-emerald-400' },
  ACCESS_DENIED: { label: 'Access denied', color: 'text-red-400' },
  OTP_VERIFIED: { label: 'OTP verified', color: 'text-emerald-400' },
  OTP_FAILED: { label: 'OTP failed', color: 'text-red-400' },
  UPLOAD_COMPLETED: { label: 'Uploaded', color: 'text-indigo-400' },
  DOCUMENT_DELETED: { label: 'Deleted', color: 'text-red-400' },
  SESSION_STARTED: { label: 'Signed in', color: 'text-emerald-400' },
  SESSION_ENDED: { label: 'Signed out', color: 'text-slate-400' },
}

export default async function ActivityPage() {
  const session = await getSession()
  if (!session) return null

  const logs = await prisma.auditLog.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      document: { select: { title: true } },
      share: { select: { recipientEmail: true } },
    },
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <p className="text-slate-400 mt-1">Complete audit trail of all document activity</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="divide-y divide-slate-800">
          {logs.length === 0 && (
            <div className="p-4 sm:p-6 lg:p-8 text-center text-slate-500 text-sm">No activity yet</div>
          )}
          {logs.map((log: typeof logs[number]) => {
            const meta = ACTION_LABELS[log.action]
            return (
              <div key={log.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="hidden h-2 w-2 flex-shrink-0 rounded-full bg-slate-700 sm:block" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${meta?.color ?? 'text-slate-300'}`}>
                      {meta?.label ?? log.action}
                    </span>
                    {log.document?.title && (
                      <span className="text-sm text-slate-400 truncate">— {log.document.title}</span>
                    )}
                    {log.pageNumber && (
                      <span className="text-xs text-slate-600">p.{log.pageNumber}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="break-all">{log.ipAddress}</span>
                    {log.share?.recipientEmail && <span className="break-all">{log.share.recipientEmail}</span>}
                  </div>
                </div>
                <span className="text-xs text-slate-600 sm:flex-shrink-0">{formatDate(log.createdAt)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
