import jwt from 'jsonwebtoken'
import type { JwtPayload } from '@/types'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: Pick<JwtPayload, 'sub' | 'sessionId'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'sub' | 'sessionId'> {
  return jwt.verify(token, REFRESH_SECRET) as Pick<JwtPayload, 'sub' | 'sessionId'>
}
