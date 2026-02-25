import crypto from "node:crypto";
import { z } from "zod";
import { forgotPasswordSchema } from "@reelforge/shared";
import { assertMethod, jsonOk, readJsonBody, withApi } from "../lib/http";
import { enforceRateLimit } from "../lib/rateLimit";
import { hashToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

type ForgotInput = z.infer<typeof forgotPasswordSchema>;

export default withApi(async (req, res) => {
  assertMethod(req, "POST");
  enforceRateLimit(req, "auth-forgot", { windowMs: 15 * 60 * 1000, max: 10 });

  const body = await readJsonBody<ForgotInput>(req, forgotPasswordSchema);
  const email = body.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  let resetToken: string | null = null;

  if (user) {
    resetToken = crypto.randomBytes(32).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(resetToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  }

  jsonOk(res, {
    success: true,
    message: "If the account exists, a reset email has been queued.",
    // Dev fallback until email provider integration is added.
    resetToken: process.env.NODE_ENV !== "production" ? resetToken : undefined,
  });
});