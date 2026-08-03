interface Attempt {
  count: number;
  firstAttemptAt: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/**
 * Single-instance, in-memory limiter -- sufficient for a home-server
 * single-user deployment (see Architecture.md ch.9), no shared store needed.
 */
const attempts = new Map<string, Attempt>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - entry.firstAttemptAt) };
  }

  entry.count += 1;
  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
