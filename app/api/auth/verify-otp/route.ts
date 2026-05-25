import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { verifyOtp } from '@/lib/auth/otp'
import { checkOtpRateLimit } from '@/lib/rate-limit/limiter'
import { logAudit, extractRequestMeta } from '@/lib/audit/logger'
import { ok, err, tooManyRequests } from '@/lib/api/response'

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  purpose: z.enum(['email_verify', 'doc_access', '2fa']),
})

export async function POST(req: Request): Promise<Response> {
  const { ipAddress, userAgent } = extractRequestMeta(req)

  const limit = await checkOtpRateLimit(ipAddress)
  if (!limit.allowed) return tooManyRequests()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err('Invalid request')

  const { email, code, purpose } = parsed.data

  const result = await verifyOtp(email, purpose, code)

  if (!result.valid) {
    await logAudit({
      action: 'OTP_FAILED',
      ipAddress,
      userAgent,
      metadata: { email, purpose, reason: result.reason },
    })
    return err(`Invalid or expired code${result.reason?.startsWith('invalid:') ? `. ${result.reason.split(':')[1]} attempts remaining` : ''}`, 400)
  }

  if (purpose === 'email_verify') {
    await prisma.user.updateMany({
      where: { email: email.toLowerCase() },
      data: { emailVerified: true },
    })
  }

  await logAudit({
    action: 'OTP_VERIFIED',
    ipAddress,
    userAgent,
    metadata: { email, purpose },
  })

  return ok({ verified: true })
}
