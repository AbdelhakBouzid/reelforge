import { checkoutRequestSchema, type CheckoutRequestInput } from "@reelforge/shared";
import { PaymentStatus } from "@prisma/client";
import { AppError } from "../lib/errors";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { assertPayPalConfigured, createPayPalOrder, createPayPalSubscription } from "../lib/paypal";
import { billingSubStatusToDb } from "../lib/serializers";

export default withApi(async (req, res) => {
  assertMethod(req, "POST");
  assertPayPalConfigured();

  const user = await requireUserFromRequest(req);
  const body = await readJsonBody<CheckoutRequestInput>(req, checkoutRequestSchema);

  if (body.kind === "subscription") {
    const plan = await prisma.plan.findUnique({
      where: { id: body.planId },
    });

    if (!plan || !plan.isActive) {
      throw new AppError(404, "PLAN_NOT_FOUND", "Plan not found.");
    }

    if (!plan.stripePriceId) {
      throw new AppError(400, "PRICE_NOT_CONFIGURED", "Plan is missing PayPal Plan ID.");
    }

    const checkout = await createPayPalSubscription({
      planId: plan.stripePriceId,
      userId: user.id,
      localPlanId: plan.id,
    });

    await prisma.subscription.upsert({
      where: { stripeSubId: checkout.id },
      update: {
        userId: user.id,
        planId: plan.id,
        status: billingSubStatusToDb(checkout.status),
      },
      create: {
        userId: user.id,
        planId: plan.id,
        stripeSubId: checkout.id,
        status: billingSubStatusToDb(checkout.status),
      },
    });

    jsonOk(res, {
      sessionId: checkout.id,
      provider: "paypal",
      kind: "subscription",
      url: checkout.approveUrl,
    });
    return;
  }

  const pack = await prisma.creditPack.findUnique({ where: { id: body.packId } });

  if (!pack || !pack.isActive) {
    throw new AppError(404, "PACK_NOT_FOUND", "Credit pack not found.");
  }

  const checkout = await createPayPalOrder({
    userId: user.id,
    packId: pack.id,
    packName: pack.name,
    amountCents: pack.price,
  });

  await prisma.payment.upsert({
    where: { stripeCheckoutSessionId: checkout.id },
    update: {
      status: PaymentStatus.PENDING,
      amount: pack.price,
      currency: "usd",
    },
    create: {
      userId: user.id,
      stripeCheckoutSessionId: checkout.id,
      amount: pack.price,
      currency: "usd",
      status: PaymentStatus.PENDING,
    },
  });

  jsonOk(res, {
    sessionId: checkout.id,
    provider: "paypal",
    kind: "pack",
    url: checkout.approveUrl,
  });
});

