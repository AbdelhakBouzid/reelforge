import { z } from "zod";
import { LedgerReason, PaymentStatus, RefType } from "@prisma/client";
import { AppError } from "../lib/errors";
import { requireUserFromRequest } from "../lib/auth";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { prisma } from "../lib/prisma";
import { amountToCents, capturePayPalOrder, getPayPalOrder, parseOrderCustomId } from "../lib/paypal";

const captureSchema = z.object({
  orderId: z.string().min(3),
});

type CaptureInput = z.infer<typeof captureSchema>;

export default withApi(async (req, res) => {
  assertMethod(req, "POST");

  const user = await requireUserFromRequest(req);
  const body = await readJsonBody<CaptureInput>(req, captureSchema);

  const order = await getPayPalOrder(body.orderId);
  const customId = parseOrderCustomId(order.purchase_units?.[0]?.custom_id);

  if (!customId || customId.userId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "Order does not belong to the authenticated user.");
  }

  const pack = await prisma.creditPack.findUnique({
    where: { id: customId.packId },
  });

  if (!pack) {
    throw new AppError(404, "PACK_NOT_FOUND", "Referenced credit pack was not found.");
  }

  const capture = await capturePayPalOrder(body.orderId);
  const captureAmountCents = amountToCents(capture.purchase_units?.[0]?.amount?.value) || pack.price;
  const captureCurrency = capture.purchase_units?.[0]?.amount?.currency_code?.toLowerCase() || "usd";

  await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { stripeCheckoutSessionId: body.orderId },
      update: {
        status: PaymentStatus.SUCCEEDED,
        amount: captureAmountCents,
        currency: captureCurrency,
      },
      create: {
        userId: user.id,
        stripeCheckoutSessionId: body.orderId,
        amount: captureAmountCents,
        currency: captureCurrency,
        status: PaymentStatus.SUCCEEDED,
      },
    });

    const existingCredit = await tx.creditsLedger.findFirst({
      where: {
        userId: user.id,
        reason: LedgerReason.PACK_PURCHASE,
        refType: RefType.CREDIT_PACK,
        refId: body.orderId,
      },
    });

    if (!existingCredit) {
      await tx.creditsLedger.create({
        data: {
          userId: user.id,
          delta: pack.credits,
          reason: LedgerReason.PACK_PURCHASE,
          refType: RefType.CREDIT_PACK,
          refId: body.orderId,
        },
      });
    }
  });

  jsonOk(res, {
    success: true,
    orderId: body.orderId,
  });
});

