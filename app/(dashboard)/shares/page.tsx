import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Shares | Vaultix' }

export default async function SharesPage() {
  const session = await getSession()
  if (!session) return null

  const shares = await prisma.share.findMany({
    where: { document: { userId: session.sub } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      document: { select: { title: true } },
      recipients: { select: { email: true, viewCount: true } },
    },
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Shares</h1>
        <p className="text-slate-400 mt-1">Manage all document share links and recipients</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Document</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Recipient</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Views</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Expires</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {shares.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                  No shares yet
                </td>
              </tr>
            )}
            {shares.map((share: typeof shares[number]) => (
              <tr key={share.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-5 py-3 text-slate-200 truncate max-w-xs">{share.document.title}</td>
                <td className="px-5 py-3 text-slate-400 truncate">
                  {share.recipientEmail ?? share.recipients[0]?.email ?? '—'}
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    share.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400' :
                    share.status === 'REVOKED' ? 'bg-red-950 text-red-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {share.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {share.currentViews}{share.maxViews ? `/${share.maxViews}` : ''}
                </td>
                <td className="px-5 py-3 text-slate-400">
                  {share.expiresAt ? formatDate(share.expiresAt) : '—'}
                </td>
                <td className="px-5 py-3 text-slate-500">{formatDate(share.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
