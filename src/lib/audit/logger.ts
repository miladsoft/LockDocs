import { prisma } from '@/lib/db/client'

interface AuditEntry {
  action: string
  userId?: string
  documentId?: string
  shareId?: string
  ipAddress: string
  userAgent: string
  country?: string
  city?: string
  deviceId?: string
  sessionId?: string
  pageNumber?: number
  duration?: number
  metadata?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry as never })
  } catch (err) {
    // Audit failures must never crash the app
    console.error('[audit] Failed to write log:', err)
  }
}

export function extractRequestMeta(req: Request): { ipAddress: string; userAgent: string } {
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '0.0.0.0'
  const ua = req.headers.get('user-agent') ?? 'unknown'
  return { ipAddress: ip, userAgent: ua }
}
