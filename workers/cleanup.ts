/**
 * Cleanup Worker — expires shares, purges deleted docs, clears old OTPs
 */

import { Worker, Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { PrismaClient } from '@prisma/client'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null })
const prisma = new PrismaClient()

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
})

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex')
const ALGORITHM = 'aes-256-gcm'
const BUCKET = process.env.S3_BUCKET!

function decryptKey(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

async function deleteS3Object(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

const cleanupQueue = new Queue('cleanup', { connection })

const worker = new Worker(
  'cleanup',
  async (job) => {
    const { type } = job.data

    if (type === 'expired_shares') {
      const expired = await prisma.share.updateMany({
        where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
        data: { status: 'EXPIRED' },
      })
      console.log(`[cleanup] Expired ${expired.count} shares`)
    }

    if (type === 'deleted_documents') {
      // Hard-delete soft-deleted docs older than 30 days + purge S3
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const docs = await prisma.document.findMany({
        where: { deletedAt: { lt: thirtyDaysAgo } },
        include: { pages: true },
      })

      for (const doc of docs) {
        const rawKey = decryptKey(doc.storageKey)
        await deleteS3Object(rawKey).catch(console.error)

        for (const page of doc.pages) {
          const pageKey = decryptKey(page.storageKey)
          await deleteS3Object(pageKey).catch(console.error)
        }

        await prisma.document.delete({ where: { id: doc.id } })
      }

      console.log(`[cleanup] Hard-deleted ${docs.length} documents`)
    }

    if (type === 'expired_otps') {
      const deleted = await prisma.otpCode.deleteMany({
        where: { OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }] },
      })
      console.log(`[cleanup] Removed ${deleted.count} expired OTPs`)
    }
  },
  { connection },
)

// Schedule recurring cleanup every hour
async function scheduleCleanup(): Promise<void> {
  await cleanupQueue.add('run', { type: 'expired_shares' }, { repeat: { every: 60 * 60 * 1000 } })
  await cleanupQueue.add('run', { type: 'deleted_documents' }, { repeat: { every: 24 * 60 * 60 * 1000 } })
  await cleanupQueue.add('run', { type: 'expired_otps' }, { repeat: { every: 30 * 60 * 1000 } })
}

scheduleCleanup().catch(console.error)

worker.on('completed', (job) => console.log(`[cleanup] Job ${job.id} done`))
worker.on('failed', (job, err) => console.error(`[cleanup] Job ${job?.id} failed:`, err.message))

console.log('[cleanup] Worker started')
