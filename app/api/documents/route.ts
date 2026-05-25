import { z } from 'zod'
import { requireSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { validateFile } from '@/lib/validation/file'
import { uploadFile, buildStorageKey } from '@/lib/storage/s3'
import { encryptStorageKey, computeChecksum, generateSecureToken } from '@/lib/crypto/encryption'
import { enqueuePdfProcessing } from '@/lib/queue/queues'
import { logAudit, extractRequestMeta } from '@/lib/audit/logger'
import { ok, err, unauthorized, tooManyRequests, serverError } from '@/lib/api/response'
import { checkApiRateLimit } from '@/lib/rate-limit/limiter'

const QUERY_SCHEMA = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']).optional(),
  search: z.string().max(200).optional(),
})

export async function GET(req: Request): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()

  const url = new URL(req.url)
  const parsed = QUERY_SCHEMA.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return err('Invalid query parameters')

  const { page, limit, status, search } = parsed.data

  const where = {
    userId: session.sub,
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { originalFilename: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      select: {
        id: true,
        title: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
        pageCount: true,
        status: true,
        tags: true,
        thumbnailKey: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { shares: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.document.count({ where }),
  ])

  return ok({ documents, total, page, limit })
}

export async function POST(req: Request): Promise<Response> {
  const session = await requireSession().catch(() => null)
  if (!session) return unauthorized()

  const { ipAddress, userAgent } = extractRequestMeta(req)
  const limit = await checkApiRateLimit(`upload:${session.sub}`)
  if (!limit.allowed) return tooManyRequests()

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return err('Invalid form data')
  }

  const file = formData.get('file')
  const title = formData.get('title')?.toString()
  const description = formData.get('description')?.toString()
  const tagsRaw = formData.get('tags')?.toString()

  if (!(file instanceof File)) return err('File is required')
  if (!title?.trim()) return err('Title is required')

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const validation = validateFile(buffer, file.type, file.name)
  if (!validation.valid) return err(validation.error)

  // Check user storage quota
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { storageUsed: true, storageLimit: true },
  })
  if (!user) return unauthorized()
  if (user.storageUsed + BigInt(buffer.length) > user.storageLimit) {
    return err('Storage quota exceeded', 413)
  }

  const checksum = computeChecksum(buffer)
  const rawStorageKey = buildStorageKey('documents', session.sub, `${generateSecureToken()}-${file.name}`)
  const encryptedKey = encryptStorageKey(rawStorageKey)

  try {
    await uploadFile(rawStorageKey, buffer, file.type, {
      'x-uploader': session.sub,
      'x-checksum': checksum,
    })
  } catch (e) {
    console.error('[upload] S3 error:', e)
    return serverError('Failed to store file')
  }

  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : []

  const document = await prisma.document.create({
    data: {
      userId: session.sub,
      title: title.trim(),
      description: description?.trim(),
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: BigInt(buffer.length),
      storageKey: encryptedKey,
      checksum,
      tags,
      status: 'PENDING',
    },
    select: { id: true, title: true, status: true },
  })

  await prisma.user.update({
    where: { id: session.sub },
    data: { storageUsed: { increment: BigInt(buffer.length) } },
  })

  await enqueuePdfProcessing({
    documentId: document.id,
    storageKey: rawStorageKey,
    mimeType: file.type,
  })

  await logAudit({
    action: 'UPLOAD_STARTED',
    userId: session.sub,
    documentId: document.id,
    ipAddress,
    userAgent,
  })

  return ok(document, 201)
}
