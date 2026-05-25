import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { hashToken } from '@/lib/crypto/encryption'
import { createOtp } from '@/lib/auth/otp'
import { logAudit, extractRequestMeta } from '@/lib/audit/logger'
import { checkApiRateLimit } from '@/lib/rate-limit/limiter'
import { ok, err, forbidden, notFound, tooManyRequests } from '@/lib/api/response'

const schema = z.object({
  token: z.string().min(32).max(128),
  email: z.string().email().optional(),
})

// First step: validate token & return document meta or request OTP
export async function POST(req: Request): Promise<Response> {
  const { ipAddress, userAgent } = extractRequestMeta(req)

  const limit = await checkApiRateLimit(`viewer:${ipAddress}`)
  if (!limit.allowed) return tooManyRequests()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err('Invalid request')

  const { token, email } = parsed.data
  const hashedToken = hashToken(token)

  const share = await prisma.share.findUnique({
    where: { token: hashedToken },
    include: { document: { select: { id: true, title: true, pageCount: true, status: true } } },
  })

  if (!share) {
    await logAudit({ action: 'ACCESS_DENIED', ipAddress, userAgent, metadata: { reason: 'invalid_token' } })
    return notFound('Document')
  }

  // Check share status
  if (share.status === 'REVOKED') {
    await logAudit({ action: 'ACCESS_DENIED', shareId: share.id, ipAddress, userAgent, metadata: { reason: 'revoked' } })
    return forbidden()
  }

  if (share.status === 'EXPIRED' || (share.expiresAt && share.expiresAt < new Date())) {
    await prisma.share.update({ where: { id: share.id }, data: { status: 'EXPIRED' } })
    await logAudit({ action: 'ACCESS_DENIED', shareId: share.id, ipAddress, userAgent, metadata: { reason: 'expired' } })
    return err('This link has expired', 410)
  }

  if (share.document.status !== 'READY') {
    return err('Document is not ready yet. Please try again later.', 503)
  }

  // Check max views
  if (share.maxViews !== null && share.currentViews >= share.maxViews) {
    return err('Maximum view limit reached', 410)
  }

  // IP restriction
  if (share.allowedIps.length > 0 && !share.allowedIps.includes(ipAddress)) {
    await logAudit({ action: 'ACCESS_DENIED', shareId: share.id, ipAddress, userAgent, metadata: { reason: 'ip_blocked' } })
    return forbidden()
  }

  // Email restriction
  if (share.allowedEmails.length > 0) {
    if (!email || !share.allowedEmails.includes(email.toLowerCase())) {
      if (!email) return ok({ requiresEmail: true, requiresOtp: false })
      await logAudit({ action: 'ACCESS_DENIED', shareId: share.id, ipAddress, userAgent, metadata: { reason: 'email_blocked' } })
      return forbidden()
    }
  }

  // OTP requirement
  if (share.requiresOtp) {
    const recipientEmail = email ?? share.recipientEmail
    if (!recipientEmail) return ok({ requiresEmail: true, requiresOtp: true })

    await createOtp(recipientEmail, 'doc_access', share.id)
    return ok({ requiresOtp: true, email: recipientEmail })
  }

  // Grant access
  await prisma.share.update({ where: { id: share.id }, data: { currentViews: { increment: 1 } } })

  await logAudit({
    action: 'ACCESS_GRANTED',
    shareId: share.id,
    documentId: share.document.id,
    ipAddress,
    userAgent,
  })

  return ok({
    granted: true,
    document: {
      id: share.document.id,
      title: share.document.title,
      pageCount: share.document.pageCount,
      allowDownload: share.allowDownload,
      allowPrint: share.allowPrint,
      allowCopy: share.allowCopy,
      showWatermark: share.showWatermark,
    },
    shareId: share.id,
  })
}
