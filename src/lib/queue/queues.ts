import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export const pdfProcessingQueue = new Queue('pdf-processing', { connection })
export const emailQueue = new Queue('email', { connection })
export const cleanupQueue = new Queue('cleanup', { connection })
export const watermarkQueue = new Queue('watermark', { connection })

export interface PdfProcessingJob {
  documentId: string
  storageKey: string
  mimeType: string
}

export interface EmailJob {
  type: 'share' | 'otp' | 'revoke'
  to: string
  payload: Record<string, string>
}

export interface CleanupJob {
  type: 'expired_shares' | 'deleted_documents' | 'expired_otps'
}

export async function enqueuePdfProcessing(job: PdfProcessingJob): Promise<void> {
  await pdfProcessingQueue.add('process', job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  })
}

export async function enqueueEmail(job: EmailJob): Promise<void> {
  await emailQueue.add('send', job, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 50,
  })
}
