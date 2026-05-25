import sharp from 'sharp'
import type { WatermarkConfig } from '@/types'

// Generates watermark overlay as PNG buffer using sharp + SVG
export async function applyWatermark(
  pageBuffer: Buffer,
  config: WatermarkConfig,
): Promise<Buffer> {
  const meta = await sharp(pageBuffer).metadata()
  const width = meta.width ?? 800
  const height = meta.height ?? 1100

  const text = [
    config.text,
    config.email,
    `IP: ${config.ip}`,
    config.timestamp,
    `Session: ${config.sessionId.slice(0, 8)}`,
  ].join(' • ')

  const opacity = Math.max(0.05, Math.min(0.5, config.opacity))

  // Build SVG watermark with diagonal tiling
  const rows = Math.ceil(height / 120) + 2
  const cols = Math.ceil(width / 300) + 2
  let textElements = ''

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const x = col * 300 + (row % 2 === 0 ? 0 : 150)
      const y = row * 120
      textElements += `
        <text
          x="${x}"
          y="${y}"
          font-family="Arial, sans-serif"
          font-size="11"
          fill="rgba(100,100,100,${opacity})"
          transform="rotate(-30 ${x} ${y})"
          pointer-events="none"
          user-select="none"
        >${escapeXml(text)}</text>`
    }
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      ${textElements}
    </svg>`

  const watermarkBuffer = Buffer.from(svg)

  return sharp(pageBuffer)
    .composite([{ input: watermarkBuffer, top: 0, left: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer()
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildWatermarkText(
  recipientName: string,
  recipientEmail: string,
  ip: string,
  sessionId: string,
): WatermarkConfig {
  return {
    text: recipientName || 'Confidential',
    email: recipientEmail,
    ip,
    timestamp: new Date().toISOString(),
    sessionId,
    opacity: 0.15,
  }
}
