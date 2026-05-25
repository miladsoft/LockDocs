import { requireSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { deleteFile } from '@/lib/storage/s3'
import { decryptStorageKey } from '@/lib/crypto/encryption'
import { logAudit, extractRequestMeta } from '@/lib/audit/logger'
import { ok, err, unauthorized, forbidden, notFound } from '@/lib/api/response'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()

  const { id } = await params

  const document = await prisma.document.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(session.role !== 'ADMIN' && { userId: session.sub }),
    },
    include: {
      pages: {
        select: { pageNumber: true, width: true, height: true, isRendered: true },
        orderBy: { pageNumber: 'asc' },
      },
      _count: { select: { shares: true } },
    },
  })

  if (!document) return notFound('Document')

  return ok(document)
}

export async function DELETE(req: Request, { params }: Params): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()

  const { id } = await params
  const { ipAddress, userAgent } = extractRequestMeta(req)

  const document = await prisma.document.findFirst({
    where: { id, deletedAt: null, userId: session.sub },
    select: { id: true, storageKey: true, fileSize: true },
  })

  if (!document) return notFound('Document')

  // Soft delete
  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'DELETED' },
  })

  // Decrement user storage usage
  await prisma.user.update({
    where: { id: session.sub },
    data: { storageUsed: { decrement: document.fileSize } },
  })

  // Revoke all active shares
  await prisma.share.updateMany({
    where: { documentId: id, status: 'ACTIVE' },
    data: { status: 'REVOKED', revokedAt: new Date() },
  })

  // Delete from storage (fire-and-forget)
  decryptStorageKey(document.storageKey)
    .then((key) => deleteFile(key))
    .catch(console.error)

  await logAudit({
    action: 'DOCUMENT_DELETED',
    userId: session.sub,
    documentId: id,
    ipAddress,
    userAgent,
  })

  return ok({ deleted: true })
}
