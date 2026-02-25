import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "./env";

const defaultAllowedOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

if (env.ALLOWED_ORIGINS) {
  for (const origin of env.ALLOWED_ORIGINS.split(",").map((value) => value.trim())) {
    if (origin) defaultAllowedOrigins.add(origin);
  }
}

function resolveAllowedOrigin(origin?: string) {
  if (!origin) return "*";

  if (defaultAllowedOrigins.has(origin)) {
    return origin;
  }

  if (origin.endsWith(".vercel.app")) {
    return origin;
  }

  return "null";
}

export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  const allowedOrigin = resolveAllowedOrigin(origin);

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization,Content-Type,Stripe-Signature,PayPal-Transmission-Id,PayPal-Transmission-Time,PayPal-Transmission-Sig,PayPal-Cert-Url,PayPal-Auth-Algo",
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
}
