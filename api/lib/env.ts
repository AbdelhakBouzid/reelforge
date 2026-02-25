import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PAYPAL_CLIENT_ID: z.string().optional().default(""),
  PAYPAL_CLIENT_SECRET: z.string().optional().default(""),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).optional().default("sandbox"),
  PAYPAL_WEBHOOK_ID: z.string().optional().default(""),
  PAYPAL_RETURN_URL: z.string().url().optional().default("http://localhost:5173/billing?paypal=success"),
  PAYPAL_CANCEL_URL: z.string().url().optional().default("http://localhost:5173/billing?paypal=cancel"),
  AI_PROVIDER: z.enum(["mock", "replicate"]).optional().default("mock"),
  REPLICATE_API_TOKEN: z.string().optional().default(""),
  REPLICATE_IMAGE_MODEL: z.string().optional().default(""),
  REPLICATE_VIDEO_MODEL: z.string().optional().default(""),
  REPLICATE_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).max(15000).optional().default(4000),
  REPLICATE_TIMEOUT_MS: z.coerce.number().int().min(30000).max(600000).optional().default(180000),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  VITE_API_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const paypalEnabled = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
