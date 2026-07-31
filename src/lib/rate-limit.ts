// ============================================================
// PromptHub — Rate Limiter (in-memory)
//
// Uses a sliding-window algorithm with in-memory Map storage.
// In serverless deployments (Vercel), this resets per-function-
// instance, so it provides basic protection at moderate traffic.
//
// For production at scale, consider:
//  - @upstash/ratelimit (Redis-backed, edge-compatible)
//  - Vercel WAF rate-limiting rules
//  - Supabase RLS + database-level throttling
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}

/**
 * Check if a key is rate-limited.
 *
 * @param key      Unique identifier (e.g. IP, user ID, or IP+route)
 * @param maxRequests  Max allowed requests in the window
 * @param windowMs     Time window in milliseconds
 * @returns  { allowed: boolean; remaining: number; resetAt: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — reset
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, newEntry);
    return { allowed: true, remaining: maxRequests - 1, resetAt: newEntry.resetAt };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Rate limit presets for different route types.
 */
export const RATE_LIMITS = {
  /** Auth endpoints — login, register, reset-password */
  AUTH: { maxRequests: 10, windowMs: 60_000 },       // 10 req/min per IP
  /** Feedback form */
  FEEDBACK: { maxRequests: 5, windowMs: 300_000 },   // 5 req/5min per IP
  /** Prompt submission */
  SUBMIT: { maxRequests: 10, windowMs: 300_000 },    // 10 req/5min per user
  /** General API */
  API: { maxRequests: 60, windowMs: 60_000 },        // 60 req/min per IP
  /** Strict — for sensitive operations */
  STRICT: { maxRequests: 3, windowMs: 300_000 },     // 3 req/5min per IP
} as const;
