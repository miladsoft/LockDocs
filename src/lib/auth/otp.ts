import crypto from 'crypto'
import { prisma } from '@/lib/db/client'
import { sendOtpEmail } from '@/lib/email/mailer'

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function createOtp(
  email: string,
  purpose: string,
  shareId?: string,
): Promise<string> {
  // Invalidate existing OTPs for this email/purpose
  await prisma.otpCode.updateMany({
    where: { email, purpose, isUsed: false },
    data: { isUsed: true },
  })

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

  await prisma.otpCode.create({
    data: { email, code, purpose, shareId, expiresAt },
  })

  await sendOtpEmail(email, code)
  return code
}

export async function verifyOtp(
  email: string,
  purpose: string,
  code: string,
): Promise<{ valid: boolean; reason?: string }> {
  const otp = await prisma.otpCode.findFirst({
    where: {
      email,
      purpose,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) return { valid: false, reason: 'expired' }

  if (otp.attempts >= otp.maxAttempts) {
    return { valid: false, reason: 'max_attempts' }
  }

  if (otp.code !== code) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    })
    const remaining = otp.maxAttempts - otp.attempts - 1
    return { valid: false, reason: `invalid:${remaining}` }
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { isUsed: true },
  })

  return { valid: true }
}
