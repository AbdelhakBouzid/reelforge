import { AppError } from "./errors";

export function getStripeClient() {
  return null;
}

export function assertStripeConfigured() {
  throw new AppError(410, "STRIPE_DEPRECATED", "Stripe is deprecated in this build. Use PayPal endpoints instead.");
}
