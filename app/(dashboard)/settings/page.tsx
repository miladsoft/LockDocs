import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { formatBytes } from '@/lib/utils'

export const metadata = { title: 'Settings | Vaultix' }

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true, role: true, storageUsed: true, storageLimit: true, createdAt: true, emailVerified: true },
  })

  if (!user) return null

  const storagePercent = Math.min(100, Math.round((Number(user.storageUsed) / Number(user.storageLimit)) * 100))

  return (
    <div className="max-w-2xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account</p>
      </div>

      {/* Profile */}
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="font-semibold text-white mb-4">Profile</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="text-slate-400">Name</dt>
            <dd className="break-words text-slate-200 sm:text-right">{user.name}</dd>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="text-slate-400">Email</dt>
            <dd className="break-all text-slate-200 sm:text-right">{user.email}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-slate-400">Role</dt>
            <dd>
              <span className={`px-2 py-0.5 rounded-full text-xs ${user.role === 'ADMIN' ? 'bg-indigo-950 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                {user.role}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Storage */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="font-semibold text-white mb-4">Storage</h2>
        <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:justify-between">
          <span className="text-slate-400">Used</span>
          <span className="text-slate-300 sm:text-right">
            {formatBytes(Number(user.storageUsed))} / {formatBytes(Number(user.storageLimit))}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-indigo-600'}`}
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-600 mt-2">{storagePercent}% used</p>
      </div>
    </div>
  )
}
