import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { hashToken } from '@/lib/crypto/encryption'
import { extractRequestMeta } from '@/lib/audit/logger'
import { checkApiRateLimit } from '@/lib/rate-limit/limiter'
import { ok, tooManyRequests } from '@/lib/api/response'

const schema = z.object({
  token: z.string().min(32),
  type: z.enum(['DEVTOOLS_DETECTED', 'SCREENSHOT_ATTEMPT', 'RAPID_PAGE_VIEWS', 'MULTIPLE_SESSIONS']),
  sessionId: z.string(),
})

export async function POST(req: Request): Promise<Response> {
  const { ipAddress, userAgent } = extractRequestMeta(req)

  const limit = await checkApiRateLimit(`suspicious:${ipAddress}`)
  if (!limit.allowed) return tooManyRequests()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return ok({ logged: false })

  const { token, type, sessionId } = parsed.data
  const hashedToken = hashToken(token)

  const share = await prisma.share.findUnique({
    where: { token: hashedToken },
    select: { id: true, documentId: true },
  })

  if (!share) return ok({ logged: false })

  await prisma.suspiciousEvent.create({
    data: {
      type,
      shareId: share.id,
      documentId: share.documentId,
      ipAddress,
      userAgent,
      details: { sessionId },
    },
  })

  return ok({ logged: true })
}
