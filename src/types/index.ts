export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface JwtPayload {
  sub: string
  email: string
  role: string
  sessionId: string
  iat: number
  exp: number
}

export interface ViewerSession {
  shareToken: string
  sessionId: string
  recipientEmail?: string
  recipientName?: string
  ipAddress: string
  userAgent: string
  startedAt: Date
}

export interface WatermarkConfig {
  text: string
  email: string
  ip: string
  timestamp: string
  sessionId: string
  opacity: number
}

export interface DocumentMeta {
  id: string
  title: string
  pageCount: number
  allowDownload: boolean
  allowPrint: boolean
  allowCopy: boolean
  showWatermark: boolean
}

export interface PageRenderRequest {
  documentId: string
  pageNumber: number
  sessionId: string
  shareToken: string
}

export type FileValidationResult =
  | { valid: true; mimeType: string; size: number }
  | { valid: false; error: string }
