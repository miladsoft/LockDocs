import { prisma } from '@/lib/db/client'

export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return Response.json({ status: 'degraded' }, { status: 503 })
  }
}
