import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { ShareForm } from './ShareForm'
import Link from 'next/link'

export const metadata = { title: 'Share Document | Vaultix' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function SharePage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params

  const doc = await prisma.document.findFirst({
    where: { id, deletedAt: null, userId: session.sub },
    select: { id: true, title: true, status: true },
  })

  if (!doc) return notFound()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
          <Link href="/documents" className="hover:text-slate-300">Documents</Link>
          <span>/</span>
          <Link href={`/documents/${id}`} className="hover:text-slate-300 truncate max-w-xs">{doc.title}</Link>
          <span>/</span>
          <span className="text-slate-300">Share</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Share Document</h1>
        <p className="text-slate-400 mt-1">Configure access permissions and generate a secure link</p>
      </div>

      {doc.status !== 'READY' ? (
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-6 text-center">
          <p className="text-amber-400 font-medium">Document is still processing</p>
          <p className="text-slate-500 text-sm mt-1">Please wait until status is READY before sharing</p>
        </div>
      ) : (
        <ShareForm documentId={doc.id} documentTitle={doc.title} />
      )}
    </div>
  )
}
