import type { VercelRequest } from "@vercel/node";
import { AppError } from "./errors";

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function enforceRateLimit(req: VercelRequest, keyPrefix: string, options: RateLimitOptions) {
  const source =
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

  const key = `${keyPrefix}:${source}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  if (current.count >= options.max) {
    throw new AppError(429, "RATE_LIMITED", "Too many requests, please try again later.");
  }

  current.count += 1;
  buckets.set(key, current);
}