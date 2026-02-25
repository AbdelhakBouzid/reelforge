import { LedgerReason, PaymentStatus, RefType } from "@prisma/client";
import { AppError } from "../lib/errors";
import { assertMethod, jsonOk, readRawBody, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { billingSubStatusToDb } from "../lib/serializers";
import { amountToCents, parseOrderCustomId, verifyPayPalWebhook } from "../lib/paypal";

export const config = {
  api: {
    bodyParser: false,
  },
};

type PayPalWebhookEvent = {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown>;
};

async function isNewEvent(eventId: string) {
  const existing = await prisma.processedWebhookEvent.findUnique({
    where: { stripeEventId: eventId },
  });
  return !existing;
}

async function markEventProcessed(eventId: string) {
  await prisma.processedWebhookEvent.create({
    data: { stripeEventId: eventId },
  });
}

async function processSubscriptionStateEvent(event: PayPalWebhookEvent) {
  const resource = event.resource ?? {};
  const subscriptionId = String(resource.id ?? "");
  const status = String(resource.status ?? "");

  if (!subscriptionId || !status) return;

  await prisma.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: {
      status: billingSubStatusToDb(status),
      currentPeriodEnd:
        typeof resource.next_billing_time === "string" ? new Date(resource.next_billing_time) : undefined,
    },
  });
}

async function processSubscriptionPaymentEvent(event: PayPalWebhookEvent) {
  const resource = event.resource ?? {};
  const subscriptionId = String(resource.billing_agreement_id ?? "");

  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubId: subscriptionId },
    include: { plan: true },
  });

  if (!subscription) return;

  const paymentRef = String(resource.id ?? event.id ?? "");
  if (!paymentRef) return;

  const grossAmount =
    (resource.amount_with_breakdown as Record<string, unknown> | undefined)?.gross_amount as
      | Record<string, unknown>
      | undefined;
  const amount = amountToCents(typeof grossAmount?.value === "string" ? grossAmount.value : null);
  const currency = typeof grossAmount?.currency_code === "string" ? grossAmount.currency_code.toLowerCase() : "usd";

  await prisma.$transaction(async (tx) => {
    const existingCredit = await tx.creditsLedger.findFirst({
      where: {
        userId: subscription.userId,
        reason: LedgerReason.SUBSCRIPTION_CREDIT,
        refType: RefType.SUBSCRIPTION,
        refId: paymentRef,
      },
    });

    if (!existingCredit) {
      await tx.creditsLedger.create({
        data: {
          userId: subscription.userId,
          delta: subscription.plan.monthlyCredits,
          reason: LedgerReason.SUBSCRIPTION_CREDIT,
          refType: RefType.SUBSCRIPTION,
          refId: paymentRef,
        },
      });
    }

    await tx.payment.upsert({
      where: { stripePaymentIntentId: paymentRef },
      update: {
        amount,
        currency,
        status: PaymentStatus.SUCCEEDED,
      },
      create: {
        userId: subscription.userId,
        stripePaymentIntentId: paymentRef,
        amount,
        currency,
        status: PaymentStatus.SUCCEEDED,
      },
    });
  });
}

async function processOrderCaptureEvent(event: PayPalWebhookEvent) {
  const resource = event.resource ?? {};
  const relatedIds =
    (resource.supplementary_data as Record<string, unknown> | undefined)?.related_ids as
      | Record<string, unknown>
      | undefined;
  const orderId = String(relatedIds?.order_id ?? "");

  if (!orderId) return;

  const customId =
    ((resource as Record<string, unknown>).custom_id as string | undefined) ||
    (((resource as Record<string, unknown>).purchase_units as Array<Record<string, unknown>> | undefined)?.[0]
      ?.custom_id as string | undefined);

  const parsed = parseOrderCustomId(customId);
  if (!parsed) return;

  const pack = await prisma.creditPack.findUnique({ where: { id: parsed.packId } });
  if (!pack) return;

  const amountRecord = (resource.amount as Record<string, unknown> | undefined) ?? undefined;
  const amount = amountToCents(typeof amountRecord?.value === "string" ? amountRecord.value : null) || pack.price;
  const currency = typeof amountRecord?.currency_code === "string" ? amountRecord.currency_code.toLowerCase() : "usd";

  await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { stripeCheckoutSessionId: orderId },
      update: {
        amount,
        currency,
        status: PaymentStatus.SUCCEEDED,
      },
      create: {
        userId: parsed.userId,
        stripeCheckoutSessionId: orderId,
        amount,
        currency,
        status: PaymentStatus.SUCCEEDED,
      },
    });

    const existingCredit = await tx.creditsLedger.findFirst({
      where: {
        userId: parsed.userId,
        reason: LedgerReason.PACK_PURCHASE,
        refType: RefType.CREDIT_PACK,
        refId: orderId,
      },
    });

    if (!existingCredit) {
      await tx.creditsLedger.create({
        data: {
          userId: parsed.userId,
          delta: pack.credits,
          reason: LedgerReason.PACK_PURCHASE,
          refType: RefType.CREDIT_PACK,
          refId: orderId,
        },
      });
    }
  });
}

export default withApi(async (req, res) => {
  assertMethod(req, "POST");

  const rawBody = await readRawBody(req);
  const event = JSON.parse(rawBody.toString("utf-8") || "{}") as PayPalWebhookEvent;
  const eventId = event.id;

  if (!eventId) {
    throw new AppError(400, "PAYPAL_WEBHOOK_INVALID", "Webhook event id is missing.");
  }

  const verified = await verifyPayPalWebhook(req.headers, event as Record<string, unknown>);
  if (!verified) {
    throw new AppError(400, "PAYPAL_WEBHOOK_INVALID_SIGNATURE", "Unable to verify PayPal webhook signature.");
  }

  const newEvent = await isNewEvent(eventId);
  if (!newEvent) {
    jsonOk(res, { received: true, duplicate: true });
    return;
  }

  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
      await processSubscriptionStateEvent(event);
      break;
    case "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED":
      await processSubscriptionPaymentEvent(event);
      break;
    case "PAYMENT.CAPTURE.COMPLETED":
      await processOrderCaptureEvent(event);
      break;
    default:
      break;
  }

  await markEventProcessed(eventId);
  jsonOk(res, { received: true });
});

