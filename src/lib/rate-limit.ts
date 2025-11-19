/**
 * Simple in-memory rate limiter suitable for short-lived serverless functions.
 * Uses a sliding window per identifier (e.g. IP address) with automatic cleanup.
 */
type Bucket = {
  count: number
  expiresAt: number
}

const buckets = new Map<string, Bucket>()
const DEFAULT_LIMIT = 5
const DEFAULT_WINDOW_MS = 60_000
const CLEANUP_INTERVAL_MS = 120_000
let lastCleanup = Date.now()

const cleanupBuckets = () => {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.expiresAt <= now) {
      buckets.delete(key)
    }
  }
  lastCleanup = now
}

/**
 * Increments the request count for the given identifier and returns whether it is allowed.
 */
export function rateLimit(
  identifier: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): boolean {
  cleanupBuckets()

  const now = Date.now()
  const bucket = buckets.get(identifier)

  if (!bucket || bucket.expiresAt <= now) {
    buckets.set(identifier, { count: 1, expiresAt: now + windowMs })
    return true
  }

  if (bucket.count + 1 > limit) {
    return false
  }

  bucket.count += 1
  buckets.set(identifier, bucket)
  return true
}
