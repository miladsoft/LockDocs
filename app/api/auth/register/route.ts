import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/client'
import { checkApiRateLimit } from '@/lib/rate-limit/limiter'
import { ok, err, tooManyRequests } from '@/lib/api/response'
import { extractRequestMeta } from '@/lib/audit/logger'

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export async function POST(req: Request): Promise<Response> {
  const { ipAddress } = extractRequestMeta(req)

  const limit = await checkApiRateLimit(`register:${ipAddress}`)
  if (!limit.allowed) return tooManyRequests()

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? 'Invalid input')
  }

  const { name, email, password } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })
  if (existing) return err('Email already registered', 409)

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name, email: normalizedEmail, passwordHash, emailVerified: true },
    select: { id: true, email: true, name: true },
  })

  return ok({ userId: user.id }, 201)
}
