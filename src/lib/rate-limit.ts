/**
 * Simple in-memory rate limiter for API endpoints.
 * No external dependencies needed.
 */
const timestamps = new Map<string, number>();

export function checkRateLimit(
  key: string,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const lastCall = timestamps.get(key);

  if (lastCall && now - lastCall < windowMs) {
    return {
      allowed: false,
      retryAfterMs: windowMs - (now - lastCall),
    };
  }

  timestamps.set(key, now);
  return { allowed: true, retryAfterMs: 0 };
}
