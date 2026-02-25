import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_SUCCESS_URL: z.string().url().optional().default("http://localhost:5173/billing?success=1"),
  STRIPE_CANCEL_URL: z.string().url().optional().default("http://localhost:5173/billing?canceled=1"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  VITE_API_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const stripeEnabled = Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);