import type { FileValidationResult } from '@/types'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB

// Validate file magic bytes (not just extension/MIME header)
const MAGIC: Array<{ bytes: number[]; mime: string }> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' }, // %PDF
  { bytes: [0x50, 0x4b, 0x03, 0x04], mime: 'application/zip' }, // PK (docx/xlsx are ZIP)
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },
]

function detectMimeFromMagic(buffer: Buffer): string | null {
  for (const sig of MAGIC) {
    const match = sig.bytes.every((b, i) => buffer[i] === b)
    if (match) return sig.mime
  }
  return null
}

export function validateFile(
  buffer: Buffer,
  declaredMime: string,
  filename: string,
): FileValidationResult {
  if (buffer.length > MAX_SIZE_BYTES) {
    return { valid: false, error: `File exceeds ${MAX_SIZE_BYTES / 1024 / 1024}MB limit` }
  }

  const detectedMagic = detectMimeFromMagic(buffer)
  if (!detectedMagic) {
    return { valid: false, error: 'Unrecognized file format' }
  }

  // ZIP magic covers DOCX/XLSX — allow if declared MIME is one of those
  const isZipBased =
    detectedMagic === 'application/zip' &&
    (declaredMime.includes('wordprocessingml') || declaredMime.includes('spreadsheetml'))

  if (!isZipBased && detectedMagic !== declaredMime) {
    return { valid: false, error: 'File content does not match declared type' }
  }

  if (!ALLOWED_MIME_TYPES[declaredMime]) {
    return { valid: false, error: 'File type not allowed' }
  }

  // Sanitize filename — no path traversal
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
  if (!safeName) {
    return { valid: false, error: 'Invalid filename' }
  }

  return { valid: true, mimeType: declaredMime, size: buffer.length }
}
