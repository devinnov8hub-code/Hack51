import type { Context, Next } from "hono";
import { errorResponse } from "../types/api-response.js";

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

// In-memory store (sufficient for a single Vercel function instance;
// upgrade to Redis/Upstash for multi-instance production deployment)
const store: RateLimitStore = {};

/**
 * Rate limiter factory.
 * @param maxRequests - max requests allowed per window
 * @param windowSeconds - window duration in seconds
 * @param keyFn - function to derive the rate limit key from context (defaults to IP)
 */
export function rateLimit(
  maxRequests: number,
  windowSeconds: number,
  keyFn?: (c: Context) => string
) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("cf-connecting-ip") ??
      "unknown";

    const key = keyFn ? keyFn(c) : `rl:${ip}:${c.req.path}`;
    const now = Date.now();

    if (!store[key] || store[key].resetAt < now) {
      store[key] = { count: 1, resetAt: now + windowSeconds * 1000 };
    } else {
      store[key].count++;
    }

    const entry = store[key];
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetIn = Math.ceil((entry.resetAt - now) / 1000);

    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(remaining));
    c.header("X-RateLimit-Reset", String(resetIn));

    if (entry.count > maxRequests) {
      return c.json(
        errorResponse(
          `Too many requests. Please wait ${resetIn} seconds before trying again.`,
          "RATE_LIMIT_EXCEEDED"
        ),
        429
      );
    }

    await next();
  };
}

// Preset configs
export const authRateLimit = rateLimit(10, 60);       // 10 req/min on auth endpoints
export const otpRateLimit = rateLimit(5, 300);         // 5 req/5 min on OTP endpoints
export const strictRateLimit = rateLimit(3, 600);      // 3 req/10 min on sensitive ops
