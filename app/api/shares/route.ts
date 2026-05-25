import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { generateSecureToken, hashToken } from '@/lib/crypto/encryption'
import { logAudit, extractRequestMeta } from '@/lib/audit/logger'
import { publishEvent, documentChannel } from '@/lib/realtime/sse'
import { sendShareEmail } from '@/lib/email/mailer'
import { ok, err, unauthorized, notFound } from '@/lib/api/response'

const schema = z.object({
  documentId: z.string().cuid(),
  recipientName: z.string().trim().min(1).max(100).optional(),
  recipientEmail: z.string().trim().email().optional(),
  message: z.string().trim().max(500).optional(),
  requiresOtp: z.boolean().default(false),
  allowedEmails: z.array(z.string().email()).max(50).default([]),
  allowedIps: z.array(z.string()).max(20).default([]),
  allowDownload: z.boolean().default(false),
  allowPrint: z.boolean().default(false),
  allowCopy: z.boolean().default(false),
  showWatermark: z.boolean().default(true),
  expiresAt: z.string().optional(),
  maxViews: z.number().int().min(1).max(10000).optional(),
})

export async function GET(req: Request): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()

  const url = new URL(req.url)
  const documentId = url.searchParams.get('documentId')

  const shares = await prisma.share.findMany({
    where: {
      document: { userId: session.sub },
      ...(documentId && { documentId }),
    },
    include: {
      recipients: { select: { email: true, name: true, viewCount: true, lastViewedAt: true } },
      document: { select: { title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(shares)
}

export async function POST(req: Request): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()

  const { ipAddress, userAgent } = extractRequestMeta(req)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? 'Invalid input')

  const data = parsed.data
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined
  if (data.expiresAt && (!expiresAt || Number.isNaN(expiresAt.getTime()))) {
    return err('Invalid expiration date')
  }

  // Verify document ownership
  const document = await prisma.document.findFirst({
    where: { id: data.documentId, userId: session.sub, deletedAt: null, status: 'READY' },
    select: { id: true, title: true },
  })
  if (!document) return notFound('Document')

  const rawToken = generateSecureToken()
  const hashedToken = hashToken(rawToken)

  const share = await prisma.share.create({
    data: {
      documentId: data.documentId,
      createdById: session.sub,
      token: hashedToken,
      requiresOtp: data.requiresOtp,
      allowedEmails: data.allowedEmails,
      allowedIps: data.allowedIps,
      allowDownload: data.allowDownload,
      allowPrint: data.allowPrint,
      allowCopy: data.allowCopy,
      showWatermark: data.showWatermark,
      expiresAt,
      maxViews: data.maxViews,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      message: data.message,
      recipients: data.recipientEmail
        ? { create: { email: data.recipientEmail, name: data.recipientName } }
        : undefined,
    },
    select: { id: true },
  })

  await logAudit({
    action: 'SHARE_CREATED',
    userId: session.sub,
    documentId: data.documentId,
    shareId: share.id,
    ipAddress,
    userAgent,
  })

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${rawToken}`

  if (data.recipientEmail) {
    sendShareEmail(
      data.recipientEmail,
      session.email,
      document.title,
      shareUrl,
      data.message,
    ).catch(console.error)
  }

  await publishEvent(documentChannel(data.documentId), {
    type: 'viewer_joined',
    shareId: share.id,
    sessionId: '',
  })

  return ok({ shareId: share.id, shareUrl }, 201)
}
