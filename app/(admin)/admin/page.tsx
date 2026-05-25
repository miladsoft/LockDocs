import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Admin | Vaultix' }

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  const [users, suspiciousEvents, totalDocs, activeShares] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, storageUsed: true, _count: { select: { documents: true } } },
    }),
    prisma.suspiciousEvent.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.share.count({ where: { status: 'ACTIVE' } }),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-slate-400 mt-1">Platform-wide security and user management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Total Documents', value: totalDocs },
          { label: 'Active Shares', value: activeShares },
          { label: 'Unresolved Alerts', value: suspiciousEvents.length },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 rounded-xl p-5 border border-slate-800">
            <p className="text-slate-400 text-sm">{s.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Suspicious Events */}
      {suspiciousEvents.length > 0 && (
        <div className="bg-red-950/20 rounded-xl border border-red-900/40 p-5">
          <h2 className="font-semibold text-red-400 mb-4">⚠ Suspicious Activity Alerts</h2>
          <div className="space-y-2">
            {suspiciousEvents.map((ev: typeof suspiciousEvents[number]) => (
              <div key={ev.id} className="flex flex-col gap-2 rounded-lg bg-slate-950/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-4">
                <span className="text-red-400 font-medium">{ev.type}</span>
                <span className="text-slate-400">{ev.ipAddress}</span>
                {ev.email && <span className="text-slate-400">{ev.email}</span>}
                <span className="text-slate-600 sm:ml-auto">{formatDate(ev.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="p-5 border-b border-slate-800">
          <h2 className="font-semibold text-white">Users</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Name</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Role</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Docs</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u: typeof users[number]) => (
              <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3 text-slate-200">{u.name}</td>
                <td className="px-5 py-3 text-slate-400">{u.email}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.role === 'ADMIN' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-400">{u._count.documents}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
