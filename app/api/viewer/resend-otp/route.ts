import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { hashToken } from '@/lib/crypto/encryption'
import { createOtp } from '@/lib/auth/otp'
import { checkOtpRateLimit } from '@/lib/rate-limit/limiter'
import { extractRequestMeta } from '@/lib/audit/logger'
import { ok, err, tooManyRequests, notFound } from '@/lib/api/response'

const schema = z.object({
  token: z.string().min(32),
  email: z.string().email(),
})

export async function POST(req: Request): Promise<Response> {
  const { ipAddress } = extractRequestMeta(req)

  const limit = await checkOtpRateLimit(ipAddress)
  if (!limit.allowed) return tooManyRequests()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err('Invalid request')

  const { token, email } = parsed.data
  const hashedToken = hashToken(token)

  const share = await prisma.share.findUnique({
    where: { token: hashedToken },
    select: { id: true, requiresOtp: true, allowedEmails: true },
  })

  if (!share || !share.requiresOtp) return notFound('Share')

  if (share.allowedEmails.length > 0 && !share.allowedEmails.includes(email.toLowerCase())) {
    return err('Email not authorized for this document')
  }

  await createOtp(email, 'doc_access', share.id)

  return ok({ sent: true })
}
