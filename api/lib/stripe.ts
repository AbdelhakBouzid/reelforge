import Stripe from "stripe";
import { env, stripeEnabled } from "./env";
import { AppError } from "./errors";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function assertStripeConfigured() {
  if (!stripeEnabled || !env.STRIPE_SECRET_KEY) {
    throw new AppError(
      503,
      "STRIPE_NOT_CONFIGURED",
      "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable checkout.",
    );
  }
}