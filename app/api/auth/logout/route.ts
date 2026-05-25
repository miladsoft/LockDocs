import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/client'
import { getSession, ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from '@/lib/auth/session'
import { logAudit, extractRequestMeta } from '@/lib/audit/logger'
import { ok } from '@/lib/api/response'

export async function POST(req: Request): Promise<Response> {
  const session = await getSession()
  const { ipAddress, userAgent } = extractRequestMeta(req)

  if (session) {
    await prisma.session.updateMany({
      where: { userId: session.sub, isActive: true },
      data: { isActive: false },
    })

    await logAudit({
      action: 'SESSION_ENDED',
      userId: session.sub,
      ipAddress,
      userAgent,
      sessionId: session.sessionId,
    })
  }

  const store = await cookies()
  store.set(ACCESS_COOKIE, '', cookieOptions(0))
  store.set(REFRESH_COOKIE, '', cookieOptions(0))

  return ok({ message: 'Logged out successfully' })
}
