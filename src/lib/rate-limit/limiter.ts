import { Redis } from 'ioredis'

let redis: Redis | null = null

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  }
  return redis
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const client = getRedis()
    const redisKey = `rl:${key}`

    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - windowSeconds

    const pipeline = client.pipeline()
    pipeline.zremrangebyscore(redisKey, '-inf', windowStart)
    pipeline.zadd(redisKey, now, `${now}-${Math.random()}`)
    pipeline.zcard(redisKey)
    pipeline.expire(redisKey, windowSeconds)

    const results = await pipeline.exec()
    const count = (results?.[2]?.[1] as number) ?? 0

    const resetAt = now + windowSeconds
    if (count > maxRequests) {
      return { allowed: false, remaining: 0, resetAt }
    }

    return { allowed: true, remaining: maxRequests - count, resetAt }
  } catch (error) {
    console.error('[rate-limit] Redis unavailable:', error)
    if (process.env.NODE_ENV !== 'production') {
      return { allowed: true, remaining: maxRequests, resetAt: Math.floor(Date.now() / 1000) + windowSeconds }
    }
    throw error
  }
}

export async function checkOtpRateLimit(email: string): Promise<RateLimitResult> {
  return rateLimit(`otp:${email}`, 5, 300) // 5 OTPs per 5 min
}

export async function checkApiRateLimit(ip: string): Promise<RateLimitResult> {
  return rateLimit(`api:${ip}`, 100, 60) // 100 req/min
}
