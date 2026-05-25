import { requireSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { logAudit, extractRequestMeta } from '@/lib/audit/logger'
import { publishEvent, shareChannel } from '@/lib/realtime/sse'
import { sendAccessRevokedEmail } from '@/lib/email/mailer'
import { ok, unauthorized, forbidden, notFound } from '@/lib/api/response'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Params): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()

  const { id } = await params
  const { ipAddress, userAgent } = extractRequestMeta(req)

  const share = await prisma.share.findUnique({
    where: { id },
    include: {
      document: { select: { userId: true, title: true } },
      recipients: { select: { email: true } },
    },
  })

  if (!share) return notFound('Share')

  if (share.document.userId !== session.sub && session.role !== 'ADMIN') {
    return forbidden()
  }

  await prisma.share.update({
    where: { id },
    data: { status: 'REVOKED', revokedAt: new Date() },
  })

  await publishEvent(shareChannel(id), { type: 'access_revoked', shareId: id })

  await logAudit({
    action: 'SHARE_REVOKED',
    userId: session.sub,
    shareId: id,
    documentId: share.documentId,
    ipAddress,
    userAgent,
  })

  // Notify recipients
  for (const recipient of share.recipients) {
    sendAccessRevokedEmail(recipient.email, share.document.title).catch(console.error)
  }

  return ok({ revoked: true })
}
