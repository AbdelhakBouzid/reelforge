import { z } from "zod";
import { LedgerReason, RefType } from "@prisma/client";
import { AppError } from "../lib/errors";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { billingSubStatusToDb, serializeSubscription } from "../lib/serializers";
import { getPayPalSubscription, parseSubscriptionCustomId } from "../lib/paypal";

const activateSchema = z.object({
  subscriptionId: z.string().min(3),
});

type ActivateInput = z.infer<typeof activateSchema>;

export default withApi(async (req, res) => {
  assertMethod(req, "POST");

  const user = await requireUserFromRequest(req);
  const body = await readJsonBody<ActivateInput>(req, activateSchema);

  const remoteSubscription = await getPayPalSubscription(body.subscriptionId);
  const custom = parseSubscriptionCustomId(remoteSubscription.custom_id);

  if (custom && custom.userId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "Subscription does not belong to the authenticated user.");
  }

  const plan =
    (custom?.planId
      ? await prisma.plan.findUnique({
          where: { id: custom.planId },
        })
      : null) ||
    (remoteSubscription.plan_id
      ? await prisma.plan.findFirst({
          where: { stripePriceId: remoteSubscription.plan_id },
        })
      : null);

  if (!plan) {
    throw new AppError(404, "PLAN_NOT_FOUND", "Cannot map PayPal subscription to a local plan.");
  }

  const status = billingSubStatusToDb(remoteSubscription.status || "incomplete");
  const currentPeriodEnd = remoteSubscription.billing_info?.next_billing_time
    ? new Date(remoteSubscription.billing_info.next_billing_time)
    : null;

  const savedSubscription = await prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.upsert({
      where: { stripeSubId: body.subscriptionId },
      update: {
        userId: user.id,
        planId: plan.id,
        stripeCustomerId: remoteSubscription.subscriber?.payer_id ?? null,
        status,
        currentPeriodEnd,
      },
      create: {
        userId: user.id,
        planId: plan.id,
        stripeSubId: body.subscriptionId,
        stripeCustomerId: remoteSubscription.subscriber?.payer_id ?? null,
        status,
        currentPeriodEnd,
      },
    });

    if (status === "ACTIVE") {
      const creditRef = `paypal-sub-initial:${body.subscriptionId}`;
      const existingCredit = await tx.creditsLedger.findFirst({
        where: {
          userId: user.id,
          reason: LedgerReason.SUBSCRIPTION_CREDIT,
          refType: RefType.SUBSCRIPTION,
          refId: creditRef,
        },
      });

      if (!existingCredit) {
        await tx.creditsLedger.create({
          data: {
            userId: user.id,
            delta: plan.monthlyCredits,
            reason: LedgerReason.SUBSCRIPTION_CREDIT,
            refType: RefType.SUBSCRIPTION,
            refId: creditRef,
          },
        });
      }
    }

    return updated;
  });

  jsonOk(res, {
    success: true,
    subscription: serializeSubscription(savedSubscription),
  });
});

