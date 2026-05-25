import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // required for MinIO
})

const BUCKET = process.env.S3_BUCKET!
let bucketReady: Promise<void> | null = null

function getS3StatusCode(error: unknown): number | undefined {
  return (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
}

function getS3ErrorName(error: unknown): string | undefined {
  return (error as { name?: string; Code?: string }).name ?? (error as { Code?: string }).Code
}

export async function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }))
      } catch (error) {
        const statusCode = getS3StatusCode(error)
        if (statusCode !== 404) throw error

        try {
          await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
        } catch (createError) {
          const createStatusCode = getS3StatusCode(createError)
          const createName = getS3ErrorName(createError)
          const alreadyExists =
            createStatusCode === 409 ||
            createName === 'BucketAlreadyOwnedByYou' ||
            createName === 'BucketAlreadyExists'

          if (!alreadyExists) throw createError
        }
      }
    })().catch((error) => {
      bucketReady = null
      throw error
    })
  }

  return bucketReady
}

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<void> {
  await ensureBucket()
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      // SSE-AES256 is AWS-only; MinIO encrypts at rest natively
    }),
  )
}

export async function downloadFile(key: string): Promise<Buffer> {
  await ensureBucket()
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export async function deleteFile(key: string): Promise<void> {
  await ensureBucket()
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export async function fileExists(key: string): Promise<boolean> {
  try {
    await ensureBucket()
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

// Presigned URL valid for 30 seconds — for internal secure streaming only
export async function getPresignedUrl(key: string, expiresIn = 30): Promise<string> {
  await ensureBucket()
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn })
}

export function buildStorageKey(category: string, id: string, filename: string): string {
  return `${category}/${id}/${filename}`
}
