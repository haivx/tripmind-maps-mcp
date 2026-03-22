const WINDOW_MS = 60_000;
const RPM_LIMIT = parseInt(process.env["RATE_LIMIT_RPM"] ?? "100", 10);

/** Result from a rate limit check. */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: number;
}

class RateLimiter {
  /** Maps a key to an array of request timestamps within the current window. */
  private windows = new Map<string, number[]>();

  /**
   * Check whether a request identified by `key` is within the rate limit.
   * Uses a sliding window of 60 seconds.
   */
  checkLimit(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // Get existing timestamps, drop expired ones
    const timestamps = (this.windows.get(key) ?? []).filter(
      (t) => t > windowStart
    );

    const allowed = timestamps.length < RPM_LIMIT;
    if (allowed) {
      timestamps.push(now);
    }
    this.windows.set(key, timestamps);

    return {
      allowed,
      remaining: Math.max(0, RPM_LIMIT - timestamps.length),
      reset_at: timestamps[0] ? timestamps[0] + WINDOW_MS : now + WINDOW_MS,
    };
  }
}

/** Singleton rate limiter shared across all tools. */
export const rateLimiter = new RateLimiter();

/**
 * Assert that the given key has not exceeded the rate limit.
 * Throws a descriptive Error if the limit is exceeded.
 * For stdio mode, use key = "stdio". For HTTP mode, use the client IP.
 */
export function assertRateLimit(key: string): void {
  const result = rateLimiter.checkLimit(key);
  if (!result.allowed) {
    const resetIn = Math.ceil((result.reset_at - Date.now()) / 1000);
    throw new Error(
      `Rate limit exceeded. ${result.remaining} requests remaining. Resets in ${resetIn}s.`
    );
  }
}
