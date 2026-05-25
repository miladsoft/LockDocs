import { cookies } from 'next/headers'
import { verifyAccessToken } from './jwt'
import type { JwtPayload } from '@/types'

const ACCESS_COOKIE = 'vaultix_access'
const REFRESH_COOKIE = 'vaultix_refresh'

export async function getSession(): Promise<JwtPayload | null> {
  const store = await cookies()
  const token = store.get(ACCESS_COOKIE)?.value
  if (!token) return null
  try {
    return verifyAccessToken(token)
  } catch {
    return null
  }
}

export async function requireSession(): Promise<JwtPayload> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

export { ACCESS_COOKIE, REFRESH_COOKIE }
