import { z } from 'zod'
import { prisma } from '@/lib/db/client'
import { decryptStorageKey, hashToken } from '@/lib/crypto/encryption'
import { downloadFile } from '@/lib/storage/s3'
import { logAudit, extractRequestMeta } from '@/lib/audit/logger'
import { checkApiRateLimit } from '@/lib/rate-limit/limiter'
import { err, forbidden, tooManyRequests } from '@/lib/api/response'

const schema = z.object({
  token: z.string().min(32),
  sessionId: z.string().min(8),
})

function attachmentName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180) || 'document'
}

export async function GET(req: Request): Promise<Response> {
  const { ipAddress, userAgent } = extractRequestMeta(req)

  const limit = await checkApiRateLimit(`download:${ipAddress}`)
  if (!limit.allowed) return tooManyRequests()

  const url = new URL(req.url)
  const parsed = schema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return err('Invalid parameters')

  const { token, sessionId } = parsed.data
  const hashedToken = hashToken(token)

  const share = await prisma.share.findUnique({
    where: { token: hashedToken },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          status: true,
          storageKey: true,
          originalFilename: true,
          mimeType: true,
        },
      },
    },
  })

  if (!share || share.status !== 'ACTIVE') return forbidden()
  if (!share.allowDownload) return forbidden()

  if (share.expiresAt && share.expiresAt < new Date()) {
    await prisma.share.update({ where: { id: share.id }, data: { status: 'EXPIRED' } }).catch(() => {})
    return err('This link has expired', 410)
  }

  if (share.maxViews !== null && share.currentViews > share.maxViews) {
    return err('Maximum view limit reached', 410)
  }

  if (share.document.status !== 'READY') return err('Document is not ready yet', 503)

  const rawKey = decryptStorageKey(share.document.storageKey)
  const fileBuffer = await downloadFile(rawKey)
  const filename = attachmentName(share.document.originalFilename || share.document.title)

  await logAudit({
    action: 'DOCUMENT_DOWNLOADED',
    shareId: share.id,
    documentId: share.document.id,
    ipAddress,
    userAgent,
    sessionId,
  })

  return new Response(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': share.document.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      Pragma: 'no-cache',
    },
  })
}
