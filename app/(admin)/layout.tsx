import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="flex min-h-dvh bg-slate-950 md:h-screen md:overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 pt-14 md:pb-0 md:pt-0">{children}</main>
    </div>
  )
}
