import { checkoutRequestSchema, type CheckoutRequestInput } from "@reelforge/shared";
import { PaymentStatus } from "@prisma/client";
import { AppError } from "../lib/errors";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { assertStripeConfigured, getStripeClient } from "../lib/stripe";

async function ensureStripeCustomer(user: { id: string; email: string; name: string | null }) {
  const existing = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      stripeCustomerId: {
        not: null,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    throw new AppError(503, "STRIPE_NOT_CONFIGURED", "Stripe is not configured.");
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: {
      userId: user.id,
    },
  });

  return customer.id;
}

export default withApi(async (req, res) => {
  assertMethod(req, "POST");

  assertStripeConfigured();
  const stripe = getStripeClient();
  if (!stripe) {
    throw new AppError(503, "STRIPE_NOT_CONFIGURED", "Stripe is not configured.");
  }

  const user = await requireUserFromRequest(req);
  const body = await readJsonBody<CheckoutRequestInput>(req, checkoutRequestSchema);
  const customerId = await ensureStripeCustomer(user);

  if (body.kind === "subscription") {
    const plan = await prisma.plan.findUnique({
      where: { id: body.planId },
    });

    if (!plan || !plan.isActive) {
      throw new AppError(404, "PLAN_NOT_FOUND", "Plan not found.");
    }

    if (!plan.stripePriceId) {
      throw new AppError(400, "PRICE_NOT_CONFIGURED", "Plan is missing Stripe price id.");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: env.STRIPE_SUCCESS_URL,
      cancel_url: env.STRIPE_CANCEL_URL,
      metadata: {
        kind: "subscription",
        userId: user.id,
        planId: plan.id,
      },
    });

    jsonOk(res, {
      sessionId: session.id,
      url: session.url,
    });
    return;
  }

  const pack = await prisma.creditPack.findUnique({ where: { id: body.packId } });

  if (!pack || !pack.isActive) {
    throw new AppError(404, "PACK_NOT_FOUND", "Credit pack not found.");
  }

  if (!pack.stripePriceId) {
    throw new AppError(400, "PRICE_NOT_CONFIGURED", "Pack is missing Stripe price id.");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: pack.stripePriceId, quantity: 1 }],
    success_url: env.STRIPE_SUCCESS_URL,
    cancel_url: env.STRIPE_CANCEL_URL,
    metadata: {
      kind: "pack",
      userId: user.id,
      packId: pack.id,
    },
  });

  await prisma.payment.upsert({
    where: { stripeCheckoutSessionId: session.id },
    update: {
      status: PaymentStatus.PENDING,
      amount: session.amount_total ?? pack.price,
      currency: session.currency ?? "usd",
    },
    create: {
      userId: user.id,
      stripeCheckoutSessionId: session.id,
      amount: session.amount_total ?? pack.price,
      currency: session.currency ?? "usd",
      status: PaymentStatus.PENDING,
    },
  });

  jsonOk(res, {
    sessionId: session.id,
    url: session.url,
  });
});