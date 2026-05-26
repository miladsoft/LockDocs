import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-dvh app-bg md:h-screen md:overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 pt-16 md:pb-0 md:pt-0">{children}</main>
    </div>
  )
}
