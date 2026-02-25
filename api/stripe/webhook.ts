import Stripe from "stripe";
import { LedgerReason, PaymentStatus, RefType, SubscriptionStatus } from "@prisma/client";
import { env } from "../lib/env";
import { AppError } from "../lib/errors";
import { assertMethod, jsonOk, readRawBody, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { assertStripeConfigured, getStripeClient } from "../lib/stripe";
import { stripeSubStatusToDb } from "../lib/serializers";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function ensureNotProcessed(eventId: string) {
  const existing = await prisma.processedWebhookEvent.findUnique({
    where: { stripeEventId: eventId },
  });

  return !existing;
}

async function markProcessed(eventId: string) {
  await prisma.processedWebhookEvent.create({
    data: {
      stripeEventId: eventId,
    },
  });
}

async function handlePackCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const packId = session.metadata?.packId;

  if (!userId || !packId) return;

  const pack = await prisma.creditPack.findUnique({ where: { id: packId } });
  if (!pack) return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { stripeCheckoutSessionId: session.id },
      update: {
        status: PaymentStatus.SUCCEEDED,
        amount: session.amount_total ?? pack.price,
        currency: session.currency ?? "usd",
      },
      create: {
        userId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        amount: session.amount_total ?? pack.price,
        currency: session.currency ?? "usd",
        status: PaymentStatus.SUCCEEDED,
      },
    });

    const existingCredit = await tx.creditsLedger.findFirst({
      where: {
        userId,
        reason: LedgerReason.PACK_PURCHASE,
        refType: RefType.CREDIT_PACK,
        refId: session.id,
      },
    });

    if (!existingCredit) {
      await tx.creditsLedger.create({
        data: {
          userId,
          delta: pack.credits,
          reason: LedgerReason.PACK_PURCHASE,
          refType: RefType.CREDIT_PACK,
          refId: session.id,
        },
      });
    }
  });
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  const stripeSubId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!userId || !planId || !stripeSubId || !stripeCustomerId) {
    return;
  }

  await prisma.subscription.upsert({
    where: { stripeSubId },
    update: {
      userId,
      planId,
      stripeCustomerId,
      status: SubscriptionStatus.ACTIVE,
    },
    create: {
      userId,
      planId,
      stripeSubId,
      stripeCustomerId,
      status: SubscriptionStatus.ACTIVE,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const invoiceData = invoice as any;
  const stripeSubId =
    typeof invoiceData.subscription === "string" ? invoiceData.subscription : invoiceData.subscription?.id;

  if (!stripeSubId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubId },
    include: { plan: true },
  });

  if (!subscription) return;

  const currentPeriodEnd = invoiceData.lines?.data?.[0]?.period?.end as number | undefined;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : subscription.currentPeriodEnd,
    },
  });

  if (invoiceData.billing_reason === "subscription_create" || invoiceData.billing_reason === "subscription_cycle") {
    const existingCredit = await prisma.creditsLedger.findFirst({
      where: {
        userId: subscription.userId,
        reason: LedgerReason.SUBSCRIPTION_CREDIT,
        refType: RefType.SUBSCRIPTION,
        refId: invoice.id,
      },
    });

    if (!existingCredit) {
      await prisma.creditsLedger.create({
        data: {
          userId: subscription.userId,
          delta: subscription.plan.monthlyCredits,
          reason: LedgerReason.SUBSCRIPTION_CREDIT,
          refType: RefType.SUBSCRIPTION,
          refId: invoice.id,
        },
      });
    }
  }

  const paymentIntentId =
    typeof invoiceData.payment_intent === "string"
      ? invoiceData.payment_intent
      : invoiceData.payment_intent?.id;

  if (paymentIntentId) {
    await prisma.payment.upsert({
      where: { stripePaymentIntentId: paymentIntentId },
      update: {
        amount: invoiceData.amount_paid,
        currency: invoiceData.currency,
        status: PaymentStatus.SUCCEEDED,
      },
      create: {
        userId: subscription.userId,
        stripePaymentIntentId: paymentIntentId,
        amount: invoiceData.amount_paid,
        currency: invoiceData.currency,
        status: PaymentStatus.SUCCEEDED,
      },
    });
  }
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const subData = subscription as any;
  const stripeSubId = subData.id as string;
  const currentPeriodEnd = subData.current_period_end ? new Date(subData.current_period_end * 1000) : null;

  await prisma.subscription.updateMany({
    where: { stripeSubId },
    data: {
      status: stripeSubStatusToDb(subData.status),
      currentPeriodEnd,
      stripeCustomerId: typeof subData.customer === "string" ? subData.customer : subData.customer?.id,
    },
  });
}

export default withApi(async (req, res) => {
  assertMethod(req, "POST");
  assertStripeConfigured();

  const stripe = getStripeClient();
  if (!stripe) {
    throw new AppError(503, "STRIPE_NOT_CONFIGURED", "Stripe is not configured.");
  }

  const signature = req.headers["stripe-signature"];

  if (!signature || Array.isArray(signature)) {
    throw new AppError(400, "MISSING_STRIPE_SIGNATURE", "Missing Stripe signature header.");
  }

  const rawBody = await readRawBody(req);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    throw new AppError(400, "INVALID_STRIPE_SIGNATURE", "Unable to verify Stripe webhook signature.", {
      message: error instanceof Error ? error.message : "Invalid signature",
    });
  }

  const shouldProcess = await ensureNotProcessed(event.id);
  if (!shouldProcess) {
    jsonOk(res, { received: true, duplicate: true });
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.kind === "pack") {
        await handlePackCheckout(session);
      }
      if (session.metadata?.kind === "subscription") {
        await handleSubscriptionCheckout(session);
      }
      break;
    }
    case "invoice.paid": {
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  await markProcessed(event.id);

  jsonOk(res, { received: true });
});